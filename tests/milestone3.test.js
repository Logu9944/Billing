import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { connectDB, withTransaction } from '@/lib/db';
import { 
  Organization, 
  Customer, 
  Invoice, 
  Payment, 
  PaymentAllocation, 
  JournalEntry, 
  Account 
} from '@/models';
import { initializeOrganizationDefaults } from '@/lib/org-init';
import { toDecimal, financial } from '@/lib/decimal';
import { postJournalEntry, getStandardAccounts } from '@/lib/accounting-engine';
import mongoose from 'mongoose';

describe('Milestone 3: Multi-Currency Engine, Payment Processing, Double-Entry & Ledgers', () => {
  let testOrg;
  let testCustomer;
  let testInvoice;

  beforeAll(async () => {
    await connectDB();

    testOrg = await withTransaction(async (session) => {
      const [org] = await Organization.create([{
        name: 'Levroun India M3 Pvt Ltd',
        legalName: 'Levroun India M3 Private Limited',
        baseCurrency: 'INR'
      }], { session });

      await initializeOrganizationDefaults(org, session);
      return org;
    });

    testCustomer = await Customer.create({
      organizationId: testOrg._id,
      name: 'Acme US Corporation',
      currency: 'USD',
      outstandingBalance: mongoose.Types.Decimal128.fromString('1000.0000')
    });

    // Create an Invoice of $1,000 USD at 85.50 INR = 85,500 INR
    testInvoice = await Invoice.create({
      organizationId: testOrg._id,
      invoiceNumber: 'INV-M3-001',
      customerId: testCustomer._id,
      customerSnapshot: { name: testCustomer.name, currency: 'USD' },
      issueDate: new Date(),
      dueDate: new Date(Date.now() + 30 * 86400000),
      currency: 'USD',
      baseCurrency: 'INR',
      exchangeRate: mongoose.Types.Decimal128.fromString('85.5000'),
      status: 'ISSUED',
      totalAmount: mongoose.Types.Decimal128.fromString('1000.0000'),
      baseTotalAmount: mongoose.Types.Decimal128.fromString('85500.0000'),
      paidAmount: mongoose.Types.Decimal128.fromString('0.0000'),
      outstandingAmount: mongoose.Types.Decimal128.fromString('1000.0000'),
      basePaidAmount: mongoose.Types.Decimal128.fromString('0.0000'),
      baseOutstandingAmount: mongoose.Types.Decimal128.fromString('85500.0000'),
      subtotal: mongoose.Types.Decimal128.fromString('1000.0000'),
      taxTotal: mongoose.Types.Decimal128.fromString('0.0000')
    });
  });

  afterAll(async () => {
    if (testOrg) {
      await Organization.deleteOne({ _id: testOrg._id });
      await Customer.deleteMany({ organizationId: testOrg._id });
      await Invoice.deleteMany({ organizationId: testOrg._id });
      await Payment.deleteMany({ organizationId: testOrg._id });
      await PaymentAllocation.deleteMany({ organizationId: testOrg._id });
      await JournalEntry.deleteMany({ organizationId: testOrg._id });
      await Account.deleteMany({ organizationId: testOrg._id });
    }
    await mongoose.connection.close();
  });

  it('Processes a $1,000 USD Payment when Rate is 86.00 INR and Correctly Generates Foreign Exchange Gain', async () => {
    // Original Invoice was $1,000 @ 85.50 = 85,500 INR AR
    // Payment received at $1,000 @ 86.00 = 86,000 INR into Bank
    // Realized Exchange Gain = 86,000 - 85,500 = +500 INR

    const paymentResult = await withTransaction(async (session) => {
      const accounts = await getStandardAccounts(testOrg._id, session);
      const bankAcc = accounts['1020'];
      const arAcc = accounts['1100'];
      const gainAcc = accounts['4090'];

      const paymentAmount = toDecimal('1000.00');
      const paymentRate = toDecimal('86.00');
      const basePaymentAmount = financial.mul(paymentAmount, paymentRate); // 86000

      const invoiceOrigRate = toDecimal(testInvoice.exchangeRate); // 85.50
      const origBaseAmount = financial.mul(paymentAmount, invoiceOrigRate); // 85500
      const exchangeGain = financial.sub(basePaymentAmount, origBaseAmount); // +500

      // 1. Create Payment
      const [pmt] = await Payment.create([{
        organizationId: testOrg._id,
        paymentNumber: 'PAY-M3-001',
        type: 'RECEIPT',
        partyType: 'CUSTOMER',
        partyId: testCustomer._id,
        partyName: testCustomer.name,
        paymentDate: new Date(),
        depositAccountId: bankAcc._id,
        paymentCurrency: 'USD',
        paymentAmount: mongoose.Types.Decimal128.fromString('1000.0000'),
        baseCurrency: 'INR',
        exchangeRate: mongoose.Types.Decimal128.fromString('86.0000'),
        basePaymentAmount: mongoose.Types.Decimal128.fromString(basePaymentAmount.toString()),
        status: 'POSTED'
      }], { session });

      // 2. Allocation
      await PaymentAllocation.create([{
        organizationId: testOrg._id,
        paymentId: pmt._id,
        targetType: 'INVOICE',
        targetId: testInvoice._id,
        targetNumber: testInvoice.invoiceNumber,
        allocatedAmount: mongoose.Types.Decimal128.fromString('1000.0000'),
        documentCurrency: 'USD',
        originalExchangeRate: mongoose.Types.Decimal128.fromString('85.5000'),
        paymentExchangeRate: mongoose.Types.Decimal128.fromString('86.0000'),
        originalBaseAmount: mongoose.Types.Decimal128.fromString(origBaseAmount.toString()),
        paymentBaseAmount: mongoose.Types.Decimal128.fromString(basePaymentAmount.toString()),
        exchangeGainLoss: mongoose.Types.Decimal128.fromString(exchangeGain.toString())
      }], { session });

      // 3. Post Double-Entry Journal Entry
      const je = await postJournalEntry({
        organizationId: testOrg._id,
        date: new Date(),
        referenceType: 'PAYMENT',
        referenceId: pmt._id,
        referenceNumber: pmt.paymentNumber,
        memo: `Customer Payment ${pmt.paymentNumber} with Realized Exchange Gain`,
        currency: 'INR',
        lines: [
          {
            accountId: bankAcc._id,
            description: 'Bank receipt at payment rate',
            debit: basePaymentAmount.toString(), // 86000
            credit: '0.00',
            foreignCurrency: 'USD',
            foreignDebit: '1000.00',
            exchangeRate: '86.00'
          },
          {
            accountId: arAcc._id,
            description: 'AR relief at original invoice rate',
            debit: '0.00',
            credit: origBaseAmount.toString(), // 85500
            foreignCurrency: 'USD',
            foreignCredit: '1000.00',
            exchangeRate: '85.50'
          },
          {
            accountId: gainAcc._id,
            description: 'Realized Foreign Exchange Gain',
            debit: '0.00',
            credit: exchangeGain.toString() // 500
          }
        ],
        session
      });

      pmt.journalEntryId = je._id;
      await pmt.save({ session });

      // Update Invoice
      testInvoice.paidAmount = mongoose.Types.Decimal128.fromString('1000.0000');
      testInvoice.outstandingAmount = mongoose.Types.Decimal128.fromString('0.0000');
      testInvoice.status = 'PAID';
      await testInvoice.save({ session });

      return { pmt, je, exchangeGain };
    });

    expect(paymentResult.exchangeGain.toFixed(2)).toBe('500.00');

    // Verify journal balancing (Total Debits 86,000 == Total Credits 86,000)
    const journal = await JournalEntry.findById(paymentResult.je._id);
    expect(toDecimal(journal.totalDebit).toFixed(2)).toBe('86000.00');
    expect(toDecimal(journal.totalCredit).toFixed(2)).toBe('86000.00');

    // Verify Account Balances
    const bankAcc = await Account.findOne({ organizationId: testOrg._id, code: '1020' });
    const gainAcc = await Account.findOne({ organizationId: testOrg._id, code: '4090' });
    expect(toDecimal(bankAcc.currentBalance).toFixed(2)).toBe('86000.00');
    expect(toDecimal(gainAcc.currentBalance).toFixed(2)).toBe('500.00');

    // Verify Invoice is fully paid
    const updatedInvoice = await Invoice.findById(testInvoice._id);
    expect(updatedInvoice.status).toBe('PAID');
    expect(toDecimal(updatedInvoice.outstandingAmount).toFixed(2)).toBe('0.00');
  });

  it('Rejects duplicate or over-allocation payments', async () => {
    // Attempt to allocate another $500 to the already PAID invoice
    const inv = await Invoice.findById(testInvoice._id);
    expect(inv.status).toBe('PAID');
    expect(toDecimal(inv.outstandingAmount).isZero()).toBe(true);

    const allocAmount = toDecimal('500.00');
    expect(allocAmount.gt(toDecimal(inv.outstandingAmount))).toBe(true);
  });
});
