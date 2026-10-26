import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withTransaction, connectDB } from '@/lib/db';
import { requireOrgContext, requireRole } from '@/lib/auth';
import { 
  Invoice, 
  Customer, 
  Product, 
  OrganizationSettings, 
  CurrencyRate, 
  AuditLog, 
  StockBalance, 
  InventoryMovement 
} from '@/models';
import { toDecimal, toDecimal128, financial, round } from '@/lib/decimal';
import { postJournalEntry, getStandardAccounts } from '@/lib/accounting-engine';
import { escapeRegex } from '@/lib/sanitize';

const InvoiceItemSchema = z.object({
  productId: z.string().optional().nullable(),
  sku: z.string().optional().default(''),
  name: z.string().min(1, 'Item name is required'),
  description: z.string().optional().default(''),
  quantity: z.union([z.number(), z.string()]),
  unitPrice: z.union([z.number(), z.string()]),
  discountPercent: z.union([z.number(), z.string()]).default(0),
  taxPercent: z.union([z.number(), z.string()]).default(0)
});

const CreateInvoiceSchema = z.object({
  customerId: z.string().min(1, 'Customer is required'),
  issueDate: z.string().or(z.date()).default(() => new Date()),
  dueDate: z.string().or(z.date()),
  currency: z.string().length(3).default('USD'),
  exchangeRate: z.number().or(z.string()).optional(),
  status: z.enum(['DRAFT', 'ISSUED']).default('ISSUED'),
  lines: z.array(InvoiceItemSchema).min(1, 'At least one line item is required'),
  paymentTerms: z.string().default('Net 30'),
  notes: z.string().optional().default(''),
  termsConditions: z.string().optional().default('')
});

export async function GET(req) {
  try {
    const { organization } = await requireOrgContext(req);
    await connectDB();

    const url = new URL(req.url);
    const status = url.searchParams.get('status');
    const customerId = url.searchParams.get('customerId');
    const search = url.searchParams.get('search');

    const query = { organizationId: organization._id };
    if (status) query.status = status;
    if (customerId) query.customerId = customerId;
    if (search) {
      const safe = escapeRegex(search);
      query.$or = [
        { invoiceNumber: { $regex: safe, $options: 'i' } },
        { 'customerSnapshot.name': { $regex: safe, $options: 'i' } }
      ];
    }

    const invoices = await Invoice.find(query).sort({ issueDate: -1, createdAt: -1 }).lean();

    return NextResponse.json({
      success: true,
      data: invoices.map(inv => ({
        ...inv,
        exchangeRate: inv.exchangeRate?.toString() || '1.0000',
        totalAmount: inv.totalAmount?.toString() || '0.00',
        baseTotalAmount: inv.baseTotalAmount?.toString() || '0.00',
        paidAmount: inv.paidAmount?.toString() || '0.00',
        outstandingAmount: inv.outstandingAmount?.toString() || '0.00',
        subtotal: inv.subtotal?.toString() || '0.00',
        taxTotal: inv.taxTotal?.toString() || '0.00'
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
    const data = CreateInvoiceSchema.parse(body);

    const result = await withTransaction(async (session) => {
      // 1. Fetch Customer
      const customer = await Customer.findOne({
        _id: data.customerId,
        organizationId: organization._id
      }).session(session);

      if (!customer) {
        throw new Error('Customer not found or invalid organization');
      }

      // 2. Resolve Multi-Currency Exchange Rate
      const invoiceCurrency = data.currency.toUpperCase();
      const baseCurrency = organization.baseCurrency.toUpperCase();
      let rateDec;

      if (invoiceCurrency === baseCurrency) {
        rateDec = toDecimal(1);
      } else if (data.exchangeRate) {
        rateDec = toDecimal(data.exchangeRate);
      } else {
        // Query stored rate
        const rateRecord = await CurrencyRate.findOne({
          organizationId: organization._id,
          fromCurrency: invoiceCurrency,
          toCurrency: baseCurrency
        }).sort({ effectiveDate: -1 }).session(session);

        if (!rateRecord) {
          throw new Error(`No exchange rate found for ${invoiceCurrency} to ${baseCurrency}. Please specify exchange rate.`);
        }
        rateDec = toDecimal(rateRecord.rate);
      }

      // 3. Process line items with Decimal.js
      let subtotalDec = toDecimal(0);
      let discountTotalDec = toDecimal(0);
      let taxTotalDec = toDecimal(0);
      let baseSubtotalDec = toDecimal(0);
      let baseTaxTotalDec = toDecimal(0);

      const processedLines = [];
      const stockDeductionItems = [];

      for (const line of data.lines) {
        const qty = toDecimal(line.quantity);
        const price = toDecimal(line.unitPrice);
        const discPct = toDecimal(line.discountPercent || 0);
        const taxPct = toDecimal(line.taxPercent || 0);

        const lineGross = financial.mul(qty, price);
        const lineDiscount = financial.div(financial.mul(lineGross, discPct), 100);
        const lineNet = financial.sub(lineGross, lineDiscount);
        const lineTax = financial.div(financial.mul(lineNet, taxPct), 100);
        const lineTotal = financial.add(lineNet, lineTax);

        const baseLineNet = financial.mul(lineNet, rateDec);
        const baseLineTax = financial.mul(lineTax, rateDec);
        const baseLineTotal = financial.mul(lineTotal, rateDec);

        subtotalDec = financial.add(subtotalDec, lineNet);
        discountTotalDec = financial.add(discountTotalDec, lineDiscount);
        taxTotalDec = financial.add(taxTotalDec, lineTax);

        baseSubtotalDec = financial.add(baseSubtotalDec, baseLineNet);
        baseTaxTotalDec = financial.add(baseTaxTotalDec, baseLineTax);

        // Check product inventory
        if (line.productId) {
          const product = await Product.findOne({
            _id: line.productId,
            organizationId: organization._id
          }).session(session);

          if (product && product.trackInventory && data.status === 'ISSUED') {
            stockDeductionItems.push({ product, qty });
          }
        }

        processedLines.push({
          productId: line.productId || null,
          sku: line.sku || '',
          name: line.name,
          description: line.description || '',
          quantity: toDecimal128(qty),
          unitPrice: toDecimal128(price),
          discountPercent: toDecimal128(discPct),
          taxPercent: toDecimal128(taxPct),
          taxAmount: toDecimal128(round(lineTax, 2)),
          lineTotal: toDecimal128(round(lineTotal, 2)),
          baseLineTotal: toDecimal128(round(baseLineTotal, 2))
        });
      }

      const totalAmountDec = financial.add(subtotalDec, taxTotalDec);
      const baseTotalAmountDec = financial.mul(totalAmountDec, rateDec);

      // 4. Generate invoice number sequence
      const settings = await OrganizationSettings.findOneAndUpdate(
        { organizationId: organization._id },
        { $inc: { nextInvoiceNumber: 1 } },
        { new: true, upsert: true, session }
      );
      const invoiceNumber = `${settings.invoicePrefix || 'INV-'}${settings.nextInvoiceNumber - 1}`;

      // 5. Create Invoice record
      const [invoice] = await Invoice.create([{
        organizationId: organization._id,
        invoiceNumber,
        customerId: customer._id,
        customerSnapshot: {
          name: customer.name,
          email: customer.email || '',
          phone: customer.phone || '',
          taxId: customer.taxId || '',
          billingAddress: customer.billingAddress || {}
        },
        issueDate: data.issueDate,
        dueDate: data.dueDate,
        currency: invoiceCurrency,
        baseCurrency,
        exchangeRate: toDecimal128(rateDec),
        exchangeRateDate: new Date(),
        exchangeRateSource: 'MANUAL',
        status: data.status,
        lines: processedLines,
        subtotal: toDecimal128(round(subtotalDec, 2)),
        discountTotal: toDecimal128(round(discountTotalDec, 2)),
        taxTotal: toDecimal128(round(taxTotalDec, 2)),
        totalAmount: toDecimal128(round(totalAmountDec, 2)),
        baseTotalAmount: toDecimal128(round(baseTotalAmountDec, 2)),
        paidAmount: toDecimal128(0),
        outstandingAmount: toDecimal128(round(totalAmountDec, 2)),
        basePaidAmount: toDecimal128(0),
        baseOutstandingAmount: toDecimal128(round(baseTotalAmountDec, 2)),
        paymentTerms: data.paymentTerms,
        notes: data.notes,
        termsConditions: data.termsConditions || settings.termsAndConditions
      }], { session });

      // 6. If ISSUED, update customer outstanding balance & post Double-Entry Journal Entry
      if (data.status === 'ISSUED') {
        const newCustomerBal = financial.add(toDecimal(customer.outstandingBalance), totalAmountDec);
        customer.outstandingBalance = toDecimal128(newCustomerBal);
        await customer.save({ session });

        // Retrieve Chart of Accounts
        const accounts = await getStandardAccounts(organization._id, session);
        const arAccount = accounts['1100'] || accounts['ACCOUNTS_RECEIVABLE'];
        const salesAccount = accounts['4010'] || accounts['SALES_REVENUE'];
        const taxAccount = accounts['2020'] || accounts['TAX_PAYABLE'];

        if (!arAccount || !salesAccount) {
          throw new Error('Standard accounts (1100 AR / 4010 Sales Revenue) are missing. Check chart of accounts.');
        }

        const journalLines = [
          {
            accountId: arAccount._id,
            description: `Invoice ${invoiceNumber} to ${customer.name}`,
            debit: round(baseTotalAmountDec, 2).toString(),
            credit: '0.00',
            foreignCurrency: invoiceCurrency,
            foreignDebit: round(totalAmountDec, 2).toString(),
            exchangeRate: rateDec.toString()
          },
          {
            accountId: salesAccount._id,
            description: `Revenue: ${invoiceNumber}`,
            debit: '0.00',
            credit: round(baseSubtotalDec, 2).toString()
          }
        ];

        if (taxTotalDec.gt(0) && taxAccount) {
          journalLines.push({
            accountId: taxAccount._id,
            description: `GST/Tax on ${invoiceNumber}`,
            debit: '0.00',
            credit: round(baseTaxTotalDec, 2).toString()
          });
        }

        // Post balanced journal entry
        const journal = await postJournalEntry({
          organizationId: organization._id,
          date: data.issueDate,
          referenceType: 'INVOICE',
          referenceId: invoice._id,
          referenceNumber: invoiceNumber,
          memo: `Invoice issued: ${invoiceNumber} - ${customer.name} (${invoiceCurrency} ${totalAmountDec.toFixed(2)} @ ${rateDec.toFixed(2)})`,
          currency: baseCurrency,
          lines: journalLines,
          idempotencyKey: `INV_POST_${invoice._id}`,
          session
        });

        invoice.journalEntryId = journal._id;
        await invoice.save({ session });

        // Deduct inventory for tracked goods
        for (const item of stockDeductionItems) {
          const product = item.product;
          const deductQty = item.qty;

          const currentStock = toDecimal(product.currentStock);
          const newStock = financial.sub(currentStock, deductQty);
          product.currentStock = toDecimal128(newStock);
          await product.save({ session });

          // Update StockBalance
          const stockBalance = await StockBalance.findOne({
            organizationId: organization._id,
            productId: product._id
          }).session(session);

          const unitCost = stockBalance ? toDecimal(stockBalance.averageUnitCost) : toDecimal(product.purchasePrice);
          const deductionCost = financial.mul(deductQty, unitCost);

          if (stockBalance) {
            stockBalance.currentQuantity = toDecimal128(newStock);
            stockBalance.totalValuation = toDecimal128(financial.mul(newStock, unitCost));
            stockBalance.lastUpdated = new Date();
            await stockBalance.save({ session });
          }

          // Record Inventory Movement
          await InventoryMovement.create([{
            organizationId: organization._id,
            productId: product._id,
            movementType: 'SALE_DEDUCTION',
            quantity: toDecimal128(deductQty),
            unitCost: toDecimal128(unitCost),
            totalCost: toDecimal128(deductionCost),
            referenceType: 'INVOICE',
            referenceId: invoice._id,
            referenceNumber: invoiceNumber,
            date: data.issueDate,
            notes: `Stock reduction for Invoice ${invoiceNumber}`
          }], { session });
        }
      }

      await AuditLog.create([{
        organizationId: organization._id,
        userId: user.userId,
        userName: user.name,
        action: data.status === 'ISSUED' ? 'POST' : 'CREATE',
        entityType: 'INVOICE',
        entityId: invoice._id,
        entityNumber: invoice.invoiceNumber,
        description: `Created invoice ${invoice.invoiceNumber} (${invoiceCurrency} ${totalAmountDec.toFixed(2)}) for ${customer.name}`
      }], { session });

      return invoice;
    });

    return NextResponse.json({ success: true, data: result }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: err.statusCode || 400 });
  }
}
