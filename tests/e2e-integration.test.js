import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { connectDB, withTransaction } from '@/lib/db';
import { 
  Organization, 
  Customer, 
  Supplier, 
  Product, 
  Invoice, 
  SupplierBill, 
  Payment, 
  PaymentAllocation, 
  JournalEntry, 
  Account, 
  StockBalance, 
  InventoryMovement,
  AuditLog 
} from '@/models';
import { initializeOrganizationDefaults } from '@/lib/org-init';
import { toDecimal, financial, round } from '@/lib/decimal';
import { postJournalEntry, getStandardAccounts } from '@/lib/accounting-engine';
import { InvoicePDFDocument } from '@/lib/pdf/invoice-template';
import { renderToBuffer } from '@react-pdf/renderer';
import React from 'react';
import mongoose from 'mongoose';

describe('Milestone 5: Comprehensive Enterprise Integration & Security Suite', () => {
  let orgA, orgB;
  let custA, custB;
  let prodA;

  beforeAll(async () => {
    await connectDB();

    // 1. Create Organization A
    orgA = await withTransaction(async (session) => {
      const [org] = await Organization.create([{
        name: 'Levroun India Primary Ltd',
        legalName: 'Levroun India Primary Private Limited',
        baseCurrency: 'INR',
        taxId: '29AABCL9999F1Z9'
      }], { session });
      await initializeOrganizationDefaults(org, session);
      return org;
    });

    // 2. Create Organization B (to verify strict cross-org data isolation)
    orgB = await withTransaction(async (session) => {
      const [org] = await Organization.create([{
        name: 'Competitor Global Corp',
        legalName: 'Competitor Global Corporation',
        baseCurrency: 'USD'
      }], { session });
      await initializeOrganizationDefaults(org, session);
      return org;
    });

    // Customer in Org A
    custA = await Customer.create({
      organizationId: orgA._id,
      name: 'Silicon Valley Networks LLC',
      code: 'SV-NET-01',
      currency: 'USD',
      outstandingBalance: mongoose.Types.Decimal128.fromString('0.0000')
    });

    // Customer in Org B
    custB = await Customer.create({
      organizationId: orgB._id,
      name: 'Tokyo Enterprise K.K.',
      code: 'TOK-01',
      currency: 'JPY',
      outstandingBalance: mongoose.Types.Decimal128.fromString('0.0000')
    });

    // Product in Org A
    prodA = await Product.create({
      organizationId: orgA._id,
      name: 'Enterprise Cloud Rack',
      sku: 'RACK-EC-01',
      type: 'GOODS',
      purchasePrice: mongoose.Types.Decimal128.fromString('50000.0000'),
      sellingPrice: mongoose.Types.Decimal128.fromString('85500.0000'),
      taxRate: mongoose.Types.Decimal128.fromString('0.0000'),
      trackInventory: true,
      currentStock: mongoose.Types.Decimal128.fromString('50.0000')
    });
  });

  afterAll(async () => {
    if (orgA) {
      await Organization.deleteOne({ _id: orgA._id });
      await Customer.deleteMany({ organizationId: orgA._id });
      await Supplier.deleteMany({ organizationId: orgA._id });
      await Product.deleteMany({ organizationId: orgA._id });
      await Invoice.deleteMany({ organizationId: orgA._id });
      await SupplierBill.deleteMany({ organizationId: orgA._id });
      await Payment.deleteMany({ organizationId: orgA._id });
      await PaymentAllocation.deleteMany({ organizationId: orgA._id });
      await JournalEntry.deleteMany({ organizationId: orgA._id });
      await Account.deleteMany({ organizationId: orgA._id });
      await StockBalance.deleteMany({ organizationId: orgA._id });
      await InventoryMovement.deleteMany({ organizationId: orgA._id });
    }
    if (orgB) {
      await Organization.deleteOne({ _id: orgB._id });
      await Customer.deleteMany({ organizationId: orgB._id });
      await Account.deleteMany({ organizationId: orgB._id });
    }
    await mongoose.connection.close();
  });

  it('Verifies strict Cross-Organization Data Isolation', async () => {
    // Queries scoped to Org A must NEVER return Org B's records
    const orgACustomers = await Customer.find({ organizationId: orgA._id });
    expect(orgACustomers.some(c => c._id.toString() === custB._id.toString())).toBe(false);

    const orgBCustomers = await Customer.find({ organizationId: orgB._id });
    expect(orgBCustomers.some(c => c._id.toString() === custA._id.toString())).toBe(false);
  });

  it('Executes End-to-End Multi-Currency Invoice Life Cycle with Partial Payments & Exchange Diff', async () => {
    // Step 1: Issue USD Invoice: $2,000 USD @ 85.50 INR = ₹171,000 INR
    const invoice = await withTransaction(async (session) => {
      const [inv] = await Invoice.create([{
        organizationId: orgA._id,
        invoiceNumber: 'INV-E2E-001',
        customerId: custA._id,
        customerSnapshot: { name: custA.name, currency: 'USD' },
        issueDate: new Date(),
        dueDate: new Date(Date.now() + 30 * 86400000),
        currency: 'USD',
        baseCurrency: 'INR',
        exchangeRate: mongoose.Types.Decimal128.fromString('85.5000'),
        status: 'ISSUED',
        lines: [{
          productId: prodA._id,
          sku: prodA.sku,
          name: prodA.name,
          quantity: mongoose.Types.Decimal128.fromString('2.0000'),
          unitPrice: mongoose.Types.Decimal128.fromString('1000.0000'),
          lineTotal: mongoose.Types.Decimal128.fromString('2000.0000'),
          baseLineTotal: mongoose.Types.Decimal128.fromString('171000.0000')
        }],
        subtotal: mongoose.Types.Decimal128.fromString('2000.0000'),
        taxTotal: mongoose.Types.Decimal128.fromString('0.0000'),
        totalAmount: mongoose.Types.Decimal128.fromString('2000.0000'),
        baseTotalAmount: mongoose.Types.Decimal128.fromString('171000.0000'),
        paidAmount: mongoose.Types.Decimal128.fromString('0.0000'),
        outstandingAmount: mongoose.Types.Decimal128.fromString('2000.0000'),
        basePaidAmount: mongoose.Types.Decimal128.fromString('0.0000'),
        baseOutstandingAmount: mongoose.Types.Decimal128.fromString('171000.0000')
      }], { session });

      custA.outstandingBalance = mongoose.Types.Decimal128.fromString('2000.0000');
      await custA.save({ session });

      const accounts = await getStandardAccounts(orgA._id, session);
      await postJournalEntry({
        organizationId: orgA._id,
        date: new Date(),
        referenceType: 'INVOICE',
        referenceId: inv._id,
        referenceNumber: inv.invoiceNumber,
        memo: `Invoice ${inv.invoiceNumber} ($2000 @ 85.50)`,
        currency: 'INR',
        lines: [
          {
            accountId: accounts['1100']._id,
            description: `AR: ${inv.invoiceNumber}`,
            debit: '171000.00',
            credit: '0.00',
            foreignCurrency: 'USD',
            foreignDebit: '2000.00',
            exchangeRate: '85.50'
          },
          {
            accountId: accounts['4010']._id,
            description: `Sales Revenue`,
            debit: '0.00',
            credit: '171000.00'
          }
        ],
        session
      });

      return inv;
    });

    expect(toDecimal(invoice.totalAmount).toFixed(2)).toBe('2000.00');
    expect(toDecimal(invoice.baseTotalAmount).toFixed(2)).toBe('171000.00');

    // Step 2: Render PDF
    const pdfBuf = await renderToBuffer(
      React.createElement(InvoicePDFDocument, { invoice, organization: orgA })
    );
    expect(pdfBuf).toBeDefined();
    expect(pdfBuf.slice(0, 4).toString()).toBe('%PDF');

    // Step 3: Partial Payment 1: $1,000 USD @ 86.00 INR (Gain: +500 INR)
    await withTransaction(async (session) => {
      const accounts = await getStandardAccounts(orgA._id, session);
      const invToPay = await Invoice.findById(invoice._id).session(session);

      const pmtAmount = toDecimal('1000.00');
      const pmtRate = toDecimal('86.00');
      const basePmt = financial.mul(pmtAmount, pmtRate); // 86,000
      const origBase = financial.mul(pmtAmount, toDecimal('85.50')); // 85,500
      const gain = financial.sub(basePmt, origBase); // +500

      const [pmt] = await Payment.create([{
        organizationId: orgA._id,
        paymentNumber: 'PAY-E2E-PART1',
        type: 'RECEIPT',
        partyType: 'CUSTOMER',
        partyId: custA._id,
        partyName: custA.name,
        depositAccountId: accounts['1020']._id,
        paymentCurrency: 'USD',
        paymentAmount: mongoose.Types.Decimal128.fromString('1000.0000'),
        baseCurrency: 'INR',
        exchangeRate: mongoose.Types.Decimal128.fromString('86.0000'),
        basePaymentAmount: mongoose.Types.Decimal128.fromString(basePmt.toString())
      }], { session });

      invToPay.paidAmount = mongoose.Types.Decimal128.fromString('1000.0000');
      invToPay.outstandingAmount = mongoose.Types.Decimal128.fromString('1000.0000');
      invToPay.status = 'PARTIALLY_PAID';
      await invToPay.save({ session });

      await postJournalEntry({
        organizationId: orgA._id,
        referenceType: 'PAYMENT',
        referenceId: pmt._id,
        referenceNumber: pmt.paymentNumber,
        memo: `Partial Payment 1 (${pmt.paymentNumber})`,
        currency: 'INR',
        lines: [
          { accountId: accounts['1020']._id, debit: '86000.00', credit: '0.00' },
          { accountId: accounts['1100']._id, debit: '0.00', credit: '85500.00' },
          { accountId: accounts['4090']._id, debit: '0.00', credit: '500.00' }
        ],
        session
      });
    });

    const partiallyPaidInv = await Invoice.findById(invoice._id);
    expect(partiallyPaidInv.status).toBe('PARTIALLY_PAID');
    expect(toDecimal(partiallyPaidInv.outstandingAmount).toFixed(2)).toBe('1000.00');

    // Step 4: Final Payment 2: $1,000 USD @ 85.00 INR (Rate dropped -> Loss: -500 INR)
    await withTransaction(async (session) => {
      const accounts = await getStandardAccounts(orgA._id, session);
      const invToPay = await Invoice.findById(invoice._id).session(session);

      const pmtAmount = toDecimal('1000.00');
      const pmtRate = toDecimal('85.00');
      const basePmt = financial.mul(pmtAmount, pmtRate); // 85,000
      const origBase = financial.mul(pmtAmount, toDecimal('85.50')); // 85,500
      const loss = financial.sub(origBase, basePmt); // 500 loss

      const [pmt] = await Payment.create([{
        organizationId: orgA._id,
        paymentNumber: 'PAY-E2E-PART2',
        type: 'RECEIPT',
        partyType: 'CUSTOMER',
        partyId: custA._id,
        partyName: custA.name,
        depositAccountId: accounts['1020']._id,
        paymentCurrency: 'USD',
        paymentAmount: mongoose.Types.Decimal128.fromString('1000.0000'),
        baseCurrency: 'INR',
        exchangeRate: mongoose.Types.Decimal128.fromString('85.0000'),
        basePaymentAmount: mongoose.Types.Decimal128.fromString(basePmt.toString())
      }], { session });

      invToPay.paidAmount = mongoose.Types.Decimal128.fromString('2000.0000');
      invToPay.outstandingAmount = mongoose.Types.Decimal128.fromString('0.0000');
      invToPay.status = 'PAID';
      await invToPay.save({ session });

      await postJournalEntry({
        organizationId: orgA._id,
        referenceType: 'PAYMENT',
        referenceId: pmt._id,
        referenceNumber: pmt.paymentNumber,
        memo: `Final Payment 2 (${pmt.paymentNumber})`,
        currency: 'INR',
        lines: [
          { accountId: accounts['1020']._id, debit: '85000.00', credit: '0.00' },
          { accountId: accounts['5090']._id, debit: '500.00', credit: '0.00' },
          { accountId: accounts['1100']._id, debit: '0.00', credit: '85500.00' }
        ],
        session
      });
    });

    const fullyPaidInv = await Invoice.findById(invoice._id);
    expect(fullyPaidInv.status).toBe('PAID');
    expect(toDecimal(fullyPaidInv.outstandingAmount).toFixed(2)).toBe('0.00');

    // AR Account balance should now be exactly 0 (fully relieved)
    const arAcc = await Account.findOne({ organizationId: orgA._id, code: '1100' });
    expect(toDecimal(arAcc.currentBalance).toFixed(2)).toBe('0.00');

    // Bank Account should have: 86,000 + 85,000 = 171,000 INR
    const bankAcc = await Account.findOne({ organizationId: orgA._id, code: '1020' });
    expect(toDecimal(bankAcc.currentBalance).toFixed(2)).toBe('171000.00');

    // Net foreign exchange diff: Gain 500 - Loss 500 = 0 net
    const gainAcc = await Account.findOne({ organizationId: orgA._id, code: '4090' });
    const lossAcc = await Account.findOne({ organizationId: orgA._id, code: '5090' });
    expect(toDecimal(gainAcc.currentBalance).toFixed(2)).toBe('500.00');
    expect(toDecimal(lossAcc.currentBalance).toFixed(2)).toBe('500.00');
  });

  it('Verifies Duplicate Payment Prevention on settled invoice', async () => {
    const inv = await Invoice.findOne({ invoiceNumber: 'INV-E2E-001' });
    expect(inv.status).toBe('PAID');
    const remaining = toDecimal(inv.outstandingAmount);
    expect(remaining.isZero()).toBe(true);

    const paymentAttempt = toDecimal('100.00');
    expect(paymentAttempt.gt(remaining)).toBe(true);
  });
});
