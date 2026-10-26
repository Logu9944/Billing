import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withTransaction, connectDB } from '@/lib/db';
import { requireOrgContext, requireRole } from '@/lib/auth';
import { 
  Payment, 
  PaymentAllocation, 
  Invoice, 
  SupplierBill, 
  Customer, 
  Supplier, 
  Account, 
  OrganizationSettings, 
  CurrencyRate, 
  AuditLog 
} from '@/models';
import { toDecimal, toDecimal128, financial, round } from '@/lib/decimal';
import { postJournalEntry, getStandardAccounts } from '@/lib/accounting-engine';

const RecordPaymentSchema = z.object({
  type: z.enum(['RECEIPT', 'DISBURSEMENT']),
  partyType: z.enum(['CUSTOMER', 'SUPPLIER']),
  partyId: z.string().min(1),
  paymentDate: z.string().or(z.date()).default(() => new Date()),
  paymentMethod: z.enum(['BANK_TRANSFER', 'CASH', 'CHEQUE', 'UPI', 'CREDIT_CARD']).default('BANK_TRANSFER'),
  depositAccountId: z.string().optional(), // If not provided, defaults to 1020 Bank
  paymentCurrency: z.string().length(3),
  paymentAmount: z.union([z.number(), z.string()]),
  exchangeRate: z.union([z.number(), z.string()]).optional(),
  reference: z.string().optional().default(''),
  notes: z.string().optional().default(''),
  allocations: z.array(z.object({
    targetId: z.string().min(1),
    amount: z.union([z.number(), z.string()])
  })).min(1, 'Payment must be allocated to at least one document')
});

export async function GET(req) {
  try {
    const { organization } = await requireOrgContext(req);
    await connectDB();

    const url = new URL(req.url);
    const type = url.searchParams.get('type');
    const query = { organizationId: organization._id };
    if (type) query.type = type;

    const payments = await Payment.find(query).sort({ paymentDate: -1, createdAt: -1 }).lean();

    return NextResponse.json({
      success: true,
      data: payments.map(p => ({
        ...p,
        paymentAmount: p.paymentAmount?.toString() || '0.00',
        basePaymentAmount: p.basePaymentAmount?.toString() || '0.00',
        exchangeRate: p.exchangeRate?.toString() || '1.0000'
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
    const data = RecordPaymentSchema.parse(body);

    const result = await withTransaction(async (session) => {
      const baseCurrency = organization.baseCurrency.toUpperCase();
      const paymentCurrency = data.paymentCurrency.toUpperCase();
      const paymentAmountDec = toDecimal(data.paymentAmount);

      // Resolve payment date exchange rate
      let paymentRateDec;
      if (paymentCurrency === baseCurrency) {
        paymentRateDec = toDecimal(1);
      } else if (data.exchangeRate) {
        paymentRateDec = toDecimal(data.exchangeRate);
      } else {
        const rateRecord = await CurrencyRate.findOne({
          organizationId: organization._id,
          fromCurrency: paymentCurrency,
          toCurrency: baseCurrency
        }).sort({ effectiveDate: -1 }).session(session);

        if (!rateRecord) {
          throw new Error(`No current exchange rate found for ${paymentCurrency} to ${baseCurrency}`);
        }
        paymentRateDec = toDecimal(rateRecord.rate);
      }

      const basePaymentAmountDec = financial.mul(paymentAmountDec, paymentRateDec);

      // Verify Party
      let partyName = '';
      let party;
      if (data.partyType === 'CUSTOMER') {
        party = await Customer.findOne({ _id: data.partyId, organizationId: organization._id }).session(session);
        if (!party) throw new Error('Customer not found');
        partyName = party.name;
      } else {
        party = await Supplier.findOne({ _id: data.partyId, organizationId: organization._id }).session(session);
        if (!party) throw new Error('Supplier not found');
        partyName = party.name;
      }

      // Accounts
      const accounts = await getStandardAccounts(organization._id, session);
      const bankAccount = data.depositAccountId 
        ? await Account.findById(data.depositAccountId).session(session)
        : (accounts['1020'] || accounts['BANK']);

      const arAccount = accounts['1100'] || accounts['ACCOUNTS_RECEIVABLE'];
      const apAccount = accounts['2010'] || accounts['ACCOUNTS_PAYABLE'];
      const exchangeGainAccount = accounts['4090'] || accounts['EXCHANGE_GAIN'];
      const exchangeLossAccount = accounts['5090'] || accounts['EXCHANGE_LOSS'];

      if (!bankAccount) throw new Error('Bank/Cash account not found');

      // Sequence number
      const settings = await OrganizationSettings.findOneAndUpdate(
        { organizationId: organization._id },
        { $inc: { nextPaymentNumber: 1 } },
        { new: true, upsert: true, session }
      );
      const paymentNumber = `${settings.paymentPrefix || 'PAY-'}${settings.nextPaymentNumber - 1}`;

      // Create Payment
      const [payment] = await Payment.create([{
        organizationId: organization._id,
        paymentNumber,
        type: data.type,
        partyType: data.partyType,
        partyId: party._id,
        partyName,
        paymentDate: data.paymentDate,
        paymentMethod: data.paymentMethod,
        depositAccountId: bankAccount._id,
        paymentCurrency,
        paymentAmount: toDecimal128(round(paymentAmountDec, 2)),
        baseCurrency,
        exchangeRate: toDecimal128(paymentRateDec),
        exchangeRateDate: data.paymentDate,
        exchangeRateSource: 'MANUAL',
        basePaymentAmount: toDecimal128(round(basePaymentAmountDec, 2)),
        reference: data.reference,
        notes: data.notes,
        status: 'POSTED'
      }], { session });

      let totalRealizedGainLoss = toDecimal(0);
      let totalOriginalBaseRelief = toDecimal(0);
      let totalAllocatedDocumentAmount = toDecimal(0);

      // Process Allocations
      for (const alloc of data.allocations) {
        const allocAmountDec = toDecimal(alloc.amount);
        totalAllocatedDocumentAmount = financial.add(totalAllocatedDocumentAmount, allocAmountDec);

        if (data.type === 'RECEIPT') {
          // Allocation to Invoice
          const invoice = await Invoice.findOne({
            _id: alloc.targetId,
            organizationId: organization._id
          }).session(session);

          if (!invoice) throw new Error(`Invoice not found: ${alloc.targetId}`);
          if (invoice.status === 'PAID' || invoice.status === 'VOID') {
            throw new Error(`Cannot allocate payment to invoice ${invoice.invoiceNumber} with status ${invoice.status}`);
          }

          const currentOutstanding = toDecimal(invoice.outstandingAmount);
          if (allocAmountDec.gt(currentOutstanding)) {
            throw new Error(`Allocation amount (${allocAmountDec.toFixed(2)}) exceeds invoice outstanding balance (${currentOutstanding.toFixed(2)}) for ${invoice.invoiceNumber}`);
          }

          const invoiceOriginalRate = toDecimal(invoice.exchangeRate);
          // Original Base Amount of this allocation = allocAmount * invoiceOriginalRate
          const origBase = financial.mul(allocAmountDec, invoiceOriginalRate);
          // Payment Base Amount of this allocation = allocAmount * paymentRate
          const pmtBase = financial.mul(allocAmountDec, paymentRateDec);
          // Realized Exchange Gain or Loss:
          // For Customer Receipt: Gain = Payment Base - Original Base
          // If USD was 85.50 when invoiced, and now 86.00: 86.00 - 85.50 = +0.50 per USD -> GAIN!
          const gainLoss = financial.sub(pmtBase, origBase);

          totalOriginalBaseRelief = financial.add(totalOriginalBaseRelief, origBase);
          totalRealizedGainLoss = financial.add(totalRealizedGainLoss, gainLoss);

          // Update Invoice balances
          const newPaid = financial.add(toDecimal(invoice.paidAmount), allocAmountDec);
          const newOutstanding = financial.sub(toDecimal(invoice.totalAmount), newPaid);
          const newBasePaid = financial.add(toDecimal(invoice.basePaidAmount), origBase);
          const newBaseOutstanding = financial.sub(toDecimal(invoice.baseTotalAmount), newBasePaid);

          invoice.paidAmount = toDecimal128(round(newPaid, 2));
          invoice.outstandingAmount = toDecimal128(round(newOutstanding, 2));
          invoice.basePaidAmount = toDecimal128(round(newBasePaid, 2));
          invoice.baseOutstandingAmount = toDecimal128(round(newBaseOutstanding, 2));
          invoice.status = newOutstanding.isZero() ? 'PAID' : 'PARTIALLY_PAID';
          await invoice.save({ session });

          // Record Payment Allocation
          await PaymentAllocation.create([{
            organizationId: organization._id,
            paymentId: payment._id,
            targetType: 'INVOICE',
            targetId: invoice._id,
            targetNumber: invoice.invoiceNumber,
            allocatedAmount: toDecimal128(round(allocAmountDec, 2)),
            documentCurrency: invoice.currency,
            originalExchangeRate: toDecimal128(invoiceOriginalRate),
            paymentExchangeRate: toDecimal128(paymentRateDec),
            originalBaseAmount: toDecimal128(round(origBase, 2)),
            paymentBaseAmount: toDecimal128(round(pmtBase, 2)),
            exchangeGainLoss: toDecimal128(round(gainLoss, 2)),
            allocatedAt: data.paymentDate
          }], { session });

        } else {
          // Allocation to Supplier Bill
          const bill = await SupplierBill.findOne({
            _id: alloc.targetId,
            organizationId: organization._id
          }).session(session);

          if (!bill) throw new Error(`Supplier bill not found: ${alloc.targetId}`);
          const currentOutstanding = toDecimal(bill.outstandingAmount);
          if (allocAmountDec.gt(currentOutstanding)) {
            throw new Error(`Allocation amount exceeds bill outstanding balance for ${bill.internalBillNumber}`);
          }

          const billOriginalRate = toDecimal(bill.exchangeRate);
          const origBase = financial.mul(allocAmountDec, billOriginalRate);
          const pmtBase = financial.mul(allocAmountDec, paymentRateDec);
          // For Supplier Disbursement:
          // If bill was at 85.50 and now we pay at 86.00: we had to pay more INR -> LOSS!
          // Gain/Loss = Original Base - Payment Base
          const gainLoss = financial.sub(origBase, pmtBase);

          totalOriginalBaseRelief = financial.add(totalOriginalBaseRelief, origBase);
          totalRealizedGainLoss = financial.add(totalRealizedGainLoss, gainLoss);

          const newPaid = financial.add(toDecimal(bill.paidAmount), allocAmountDec);
          const newOutstanding = financial.sub(toDecimal(bill.totalAmount), newPaid);
          bill.paidAmount = toDecimal128(round(newPaid, 2));
          bill.outstandingAmount = toDecimal128(round(newOutstanding, 2));
          bill.status = newOutstanding.isZero() ? 'PAID' : 'PARTIALLY_PAID';
          await bill.save({ session });

          await PaymentAllocation.create([{
            organizationId: organization._id,
            paymentId: payment._id,
            targetType: 'SUPPLIER_BILL',
            targetId: bill._id,
            targetNumber: bill.internalBillNumber,
            allocatedAmount: toDecimal128(round(allocAmountDec, 2)),
            documentCurrency: bill.currency,
            originalExchangeRate: toDecimal128(billOriginalRate),
            paymentExchangeRate: toDecimal128(paymentRateDec),
            originalBaseAmount: toDecimal128(round(origBase, 2)),
            paymentBaseAmount: toDecimal128(round(pmtBase, 2)),
            exchangeGainLoss: toDecimal128(round(gainLoss, 2)),
            allocatedAt: data.paymentDate
          }], { session });
        }
      }

      // Update Party outstanding balance
      const newPartyBal = financial.sub(toDecimal(party.outstandingBalance), totalAllocatedDocumentAmount);
      party.outstandingBalance = toDecimal128(newPartyBal.gte(0) ? round(newPartyBal, 2) : 0);
      await party.save({ session });

      // Build and Post Double-Entry Journal Entry
      const journalLines = [];

      if (data.type === 'RECEIPT') {
        // Customer Payment Received:
        // DR Bank (at payment date value)
        // CR Accounts Receivable (at original invoice value)
        // CR Foreign Exchange Gain (if gain) OR DR Foreign Exchange Loss (if loss)
        journalLines.push({
          accountId: bankAccount._id,
          description: `Receipt from ${partyName} (Ref: ${paymentNumber})`,
          debit: round(basePaymentAmountDec, 2).toString(),
          credit: '0.00',
          foreignCurrency: paymentCurrency,
          foreignDebit: round(paymentAmountDec, 2).toString(),
          exchangeRate: paymentRateDec.toString()
        });

        journalLines.push({
          accountId: arAccount._id,
          description: `AR Relief for ${partyName}`,
          debit: '0.00',
          credit: round(totalOriginalBaseRelief, 2).toString(),
          foreignCurrency: paymentCurrency,
          foreignCredit: round(totalAllocatedDocumentAmount, 2).toString()
        });

        if (totalRealizedGainLoss.gt(0)) {
          // Gain -> Credit 4090
          journalLines.push({
            accountId: exchangeGainAccount._id,
            description: `Foreign Exchange Gain on Payment ${paymentNumber}`,
            debit: '0.00',
            credit: round(totalRealizedGainLoss, 2).toString()
          });
        } else if (totalRealizedGainLoss.lt(0)) {
          // Loss -> Debit 5090
          journalLines.push({
            accountId: exchangeLossAccount._id,
            description: `Foreign Exchange Loss on Payment ${paymentNumber}`,
            debit: round(totalRealizedGainLoss.abs(), 2).toString(),
            credit: '0.00'
          });
        }
      } else {
        // Supplier Payment Disbursed:
        // DR Accounts Payable (at original bill value)
        // CR Bank (at payment date value)
        // CR Foreign Exchange Gain (if gain) OR DR Foreign Exchange Loss (if loss)
        journalLines.push({
          accountId: apAccount._id,
          description: `AP Relief for ${partyName} (Ref: ${paymentNumber})`,
          debit: round(totalOriginalBaseRelief, 2).toString(),
          credit: '0.00',
          foreignCurrency: paymentCurrency,
          foreignDebit: round(totalAllocatedDocumentAmount, 2).toString()
        });

        journalLines.push({
          accountId: bankAccount._id,
          description: `Disbursement to ${partyName}`,
          debit: '0.00',
          credit: round(basePaymentAmountDec, 2).toString(),
          foreignCurrency: paymentCurrency,
          foreignCredit: round(paymentAmountDec, 2).toString(),
          exchangeRate: paymentRateDec.toString()
        });

        if (totalRealizedGainLoss.gt(0)) {
          journalLines.push({
            accountId: exchangeGainAccount._id,
            description: `Foreign Exchange Gain on Supplier Payment ${paymentNumber}`,
            debit: '0.00',
            credit: round(totalRealizedGainLoss, 2).toString()
          });
        } else if (totalRealizedGainLoss.lt(0)) {
          journalLines.push({
            accountId: exchangeLossAccount._id,
            description: `Foreign Exchange Loss on Supplier Payment ${paymentNumber}`,
            debit: round(totalRealizedGainLoss.abs(), 2).toString(),
            credit: '0.00'
          });
        }
      }

      // Post Journal Entry
      const journal = await postJournalEntry({
        organizationId: organization._id,
        date: data.paymentDate,
        referenceType: 'PAYMENT',
        referenceId: payment._id,
        referenceNumber: paymentNumber,
        memo: `Payment ${paymentNumber}: ${partyName} (${paymentCurrency} ${paymentAmountDec.toFixed(2)})`,
        currency: baseCurrency,
        lines: journalLines,
        idempotencyKey: `PMT_POST_${payment._id}`,
        session
      });

      payment.journalEntryId = journal._id;
      await payment.save({ session });

      await AuditLog.create([{
        organizationId: organization._id,
        userId: user.userId,
        userName: user.name,
        action: 'PAYMENT_RECORDED',
        entityType: 'PAYMENT',
        entityId: payment._id,
        entityNumber: paymentNumber,
        description: `Recorded payment ${paymentNumber} of ${paymentCurrency} ${paymentAmountDec.toFixed(2)} from/to ${partyName}`
      }], { session });

      return payment;
    });

    return NextResponse.json({ success: true, data: result }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: err.statusCode || 400 });
  }
}
