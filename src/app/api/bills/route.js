import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withTransaction, connectDB } from '@/lib/db';
import { requireOrgContext, requireRole } from '@/lib/auth';
import { 
  SupplierBill, 
  Supplier, 
  OrganizationSettings, 
  CurrencyRate, 
  AuditLog,
  Account 
} from '@/models';
import { toDecimal, toDecimal128, financial, round } from '@/lib/decimal';
import { postJournalEntry, getStandardAccounts } from '@/lib/accounting-engine';
import { escapeRegex } from '@/lib/sanitize';

const BillItemSchema = z.object({
  productId: z.string().optional().nullable(),
  description: z.string().min(1, 'Description is required'),
  quantity: z.union([z.number(), z.string()]),
  unitPrice: z.union([z.number(), z.string()]),
  taxPercent: z.union([z.number(), z.string()]).default(0),
  expenseAccountId: z.string().optional().nullable()
});

const CreateBillSchema = z.object({
  supplierId: z.string().min(1, 'Supplier is required'),
  billNumber: z.string().min(1, 'Supplier invoice reference number is required'),
  billDate: z.string().or(z.date()).default(() => new Date()),
  dueDate: z.string().or(z.date()),
  currency: z.string().length(3).default('INR'),
  exchangeRate: z.number().or(z.string()).optional(),
  status: z.enum(['DRAFT', 'ISSUED']).default('ISSUED'),
  lines: z.array(BillItemSchema).min(1, 'At least one line item is required'),
  notes: z.string().optional().default('')
});

export async function GET(req) {
  try {
    const { organization } = await requireOrgContext(req);
    await connectDB();

    const url = new URL(req.url);
    const status = url.searchParams.get('status');
    const supplierId = url.searchParams.get('supplierId');
    const search = url.searchParams.get('search');

    const query = { organizationId: organization._id };
    if (status) query.status = status;
    if (supplierId) query.supplierId = supplierId;
    if (search) {
      const safe = escapeRegex(search);
      query.$or = [
        { billNumber: { $regex: safe, $options: 'i' } },
        { internalBillNumber: { $regex: safe, $options: 'i' } },
        { 'supplierSnapshot.name': { $regex: safe, $options: 'i' } }
      ];
    }

    const bills = await SupplierBill.find(query).sort({ billDate: -1, createdAt: -1 }).lean();

    return NextResponse.json({
      success: true,
      data: bills.map(b => ({
        ...b,
        exchangeRate: b.exchangeRate?.toString() || '1.0000',
        totalAmount: b.totalAmount?.toString() || '0.00',
        baseTotalAmount: b.baseTotalAmount?.toString() || '0.00',
        paidAmount: b.paidAmount?.toString() || '0.00',
        outstandingAmount: b.outstandingAmount?.toString() || '0.00',
        subtotal: b.subtotal?.toString() || '0.00',
        taxTotal: b.taxTotal?.toString() || '0.00'
      }))
    });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: err.statusCode || 500 });
  }
}

export async function POST(req) {
  try {
    const { user, membership, organization } = await requireOrgContext(req);
    requireRole(membership);
    const body = await req.json();
    const data = CreateBillSchema.parse(body);

    const result = await withTransaction(async (session) => {
      const supplier = await Supplier.findOne({
        _id: data.supplierId,
        organizationId: organization._id
      }).session(session);

      if (!supplier) {
        throw new Error('Supplier not found');
      }

      const billCurrency = data.currency.toUpperCase();
      const baseCurrency = organization.baseCurrency.toUpperCase();
      let rateDec;

      if (billCurrency === baseCurrency) {
        rateDec = toDecimal(1);
      } else if (data.exchangeRate) {
        rateDec = toDecimal(data.exchangeRate);
      } else {
        const rateRecord = await CurrencyRate.findOne({
          organizationId: organization._id,
          fromCurrency: billCurrency,
          toCurrency: baseCurrency
        }).sort({ effectiveDate: -1 }).session(session);

        if (!rateRecord) {
          throw new Error(`No exchange rate found for ${billCurrency} to ${baseCurrency}`);
        }
        rateDec = toDecimal(rateRecord.rate);
      }

      let subtotalDec = toDecimal(0);
      let taxTotalDec = toDecimal(0);
      let baseSubtotalDec = toDecimal(0);
      let baseTaxTotalDec = toDecimal(0);

      const processedLines = [];

      for (const line of data.lines) {
        const qty = toDecimal(line.quantity);
        const price = toDecimal(line.unitPrice);
        const taxPct = toDecimal(line.taxPercent || 0);

        const lineNet = financial.mul(qty, price);
        const lineTax = financial.div(financial.mul(lineNet, taxPct), 100);
        const lineTotal = financial.add(lineNet, lineTax);

        const baseLineNet = financial.mul(lineNet, rateDec);
        const baseLineTax = financial.mul(lineTax, rateDec);
        const baseLineTotal = financial.mul(lineTotal, rateDec);

        subtotalDec = financial.add(subtotalDec, lineNet);
        taxTotalDec = financial.add(taxTotalDec, lineTax);
        baseSubtotalDec = financial.add(baseSubtotalDec, baseLineNet);
        baseTaxTotalDec = financial.add(baseTaxTotalDec, baseLineTax);

        processedLines.push({
          productId: line.productId || null,
          description: line.description,
          quantity: toDecimal128(qty),
          unitPrice: toDecimal128(price),
          taxPercent: toDecimal128(taxPct),
          taxAmount: toDecimal128(round(lineTax, 2)),
          lineTotal: toDecimal128(round(lineTotal, 2)),
          baseLineTotal: toDecimal128(round(baseLineTotal, 2)),
          expenseAccountId: line.expenseAccountId || null
        });
      }

      const totalAmountDec = financial.add(subtotalDec, taxTotalDec);
      const baseTotalAmountDec = financial.mul(totalAmountDec, rateDec);

      const settings = await OrganizationSettings.findOneAndUpdate(
        { organizationId: organization._id },
        { $inc: { nextBillNumber: 1 } },
        { new: true, upsert: true, session }
      );
      const internalBillNumber = `${settings.billPrefix || 'BILL-'}${settings.nextBillNumber - 1}`;

      const [bill] = await SupplierBill.create([{
        organizationId: organization._id,
        billNumber: data.billNumber,
        internalBillNumber,
        supplierId: supplier._id,
        supplierSnapshot: {
          name: supplier.name,
          email: supplier.email || '',
          phone: supplier.phone || '',
          taxId: supplier.taxId || '',
          address: supplier.address || {}
        },
        billDate: data.billDate,
        dueDate: data.dueDate,
        currency: billCurrency,
        baseCurrency,
        exchangeRate: toDecimal128(rateDec),
        status: data.status,
        lines: processedLines,
        subtotal: toDecimal128(round(subtotalDec, 2)),
        taxTotal: toDecimal128(round(taxTotalDec, 2)),
        totalAmount: toDecimal128(round(totalAmountDec, 2)),
        baseTotalAmount: toDecimal128(round(baseTotalAmountDec, 2)),
        paidAmount: toDecimal128(0),
        outstandingAmount: toDecimal128(round(totalAmountDec, 2)),
        basePaidAmount: toDecimal128(0),
        baseOutstandingAmount: toDecimal128(round(baseTotalAmountDec, 2)),
        notes: data.notes
      }], { session });

      if (data.status === 'ISSUED') {
        // Increase supplier balance
        const newSupplierBal = financial.add(toDecimal(supplier.outstandingBalance), totalAmountDec);
        supplier.outstandingBalance = toDecimal128(newSupplierBal);
        await supplier.save({ session });

        // Retrieve Accounts
        const accounts = await getStandardAccounts(organization._id, session);
        const apAccount = accounts['2010'] || accounts['ACCOUNTS_PAYABLE'];
        const expenseAccount = accounts['5020'] || accounts['OPERATING_EXPENSE'];
        const taxAccount = accounts['2020'] || accounts['TAX_PAYABLE'];

        if (!apAccount || !expenseAccount) {
          throw new Error('Standard accounts (2010 AP / 5020 Operating Expense) not found');
        }

        const journalLines = [
          {
            accountId: expenseAccount._id,
            description: `Expense on Bill ${internalBillNumber} (${data.billNumber})`,
            debit: round(baseSubtotalDec, 2).toString(),
            credit: '0.00'
          }
        ];

        if (taxTotalDec.gt(0) && taxAccount) {
          journalLines.push({
            accountId: taxAccount._id,
            description: `Input Tax on ${internalBillNumber}`,
            debit: round(baseTaxTotalDec, 2).toString(),
            credit: '0.00'
          });
        }

        journalLines.push({
          accountId: apAccount._id,
          description: `AP Bill ${internalBillNumber} - ${supplier.name}`,
          debit: '0.00',
          credit: round(baseTotalAmountDec, 2).toString(),
          foreignCurrency: billCurrency,
          foreignCredit: round(totalAmountDec, 2).toString(),
          exchangeRate: rateDec.toString()
        });

        const journal = await postJournalEntry({
          organizationId: organization._id,
          date: data.billDate,
          referenceType: 'SUPPLIER_BILL',
          referenceId: bill._id,
          referenceNumber: internalBillNumber,
          memo: `Supplier Bill: ${internalBillNumber} - ${supplier.name} (${billCurrency} ${totalAmountDec.toFixed(2)})`,
          currency: baseCurrency,
          lines: journalLines,
          idempotencyKey: `BILL_POST_${bill._id}`,
          session
        });

        bill.journalEntryId = journal._id;
        await bill.save({ session });
      }

      await AuditLog.create([{
        organizationId: organization._id,
        userId: user.userId,
        userName: user.name,
        action: data.status === 'ISSUED' ? 'POST' : 'CREATE',
        entityType: 'SUPPLIER_BILL',
        entityId: bill._id,
        entityNumber: internalBillNumber,
        description: `Created supplier bill ${internalBillNumber} from ${supplier.name}`
      }], { session });

      return bill;
    });

    return NextResponse.json({ success: true, data: result }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: err.statusCode || 400 });
  }
}
