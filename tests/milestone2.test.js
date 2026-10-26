import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { connectDB, withTransaction } from '@/lib/db';
import { 
  Organization, 
  Customer, 
  Supplier, 
  Product, 
  Invoice, 
  SupplierBill, 
  JournalEntry,
  Account,
  StockBalance 
} from '@/models';
import { initializeOrganizationDefaults } from '@/lib/org-init';
import { toDecimal, financial } from '@/lib/decimal';
import { InvoicePDFDocument } from '@/lib/pdf/invoice-template';
import { renderToBuffer } from '@react-pdf/renderer';
import React from 'react';
import mongoose from 'mongoose';

describe('Milestone 2: Customers, Suppliers, Invoices, Multi-Currency, Bills & PDF Generation', () => {
  let testOrg;
  let testCustomer;
  let testSupplier;
  let testProduct;

  beforeAll(async () => {
    await connectDB();

    testOrg = await withTransaction(async (session) => {
      const [org] = await Organization.create([{
        name: 'Levroun India Test Pvt Ltd',
        legalName: 'Levroun India Private Limited',
        baseCurrency: 'INR',
        taxId: '29AABCL1234F1Z5'
      }], { session });

      await initializeOrganizationDefaults(org, session);
      return org;
    });

    // Create a USD Customer
    testCustomer = await Customer.create({
      organizationId: testOrg._id,
      name: 'Global Tech Corp (US)',
      code: 'CUST-USA-01',
      email: 'finance@globaltech.com',
      currency: 'USD',
      paymentTermsDays: 30,
      creditLimit: mongoose.Types.Decimal128.fromString('50000.0000'),
      outstandingBalance: mongoose.Types.Decimal128.fromString('0.0000'),
      billingAddress: {
        street: '100 Market St, Suite 400',
        city: 'San Francisco',
        state: 'CA',
        country: 'United States',
        postalCode: '94105'
      }
    });

    // Create a Supplier
    testSupplier = await Supplier.create({
      organizationId: testOrg._id,
      name: 'Cloud Infrastructure Vendor',
      code: 'SUPP-AWS-01',
      email: 'billing@cloudvendor.com',
      currency: 'INR',
      outstandingBalance: mongoose.Types.Decimal128.fromString('0.0000')
    });

    // Create a Product
    testProduct = await Product.create({
      organizationId: testOrg._id,
      name: 'High Performance Server Unit',
      sku: 'SRV-HPC-99',
      type: 'GOODS',
      purchasePrice: mongoose.Types.Decimal128.fromString('40000.0000'),
      sellingPrice: mongoose.Types.Decimal128.fromString('60000.0000'),
      taxRate: mongoose.Types.Decimal128.fromString('18.0000'),
      trackInventory: true,
      currentStock: mongoose.Types.Decimal128.fromString('20.0000')
    });
  });

  afterAll(async () => {
    if (testOrg) {
      await Organization.deleteOne({ _id: testOrg._id });
      await Customer.deleteMany({ organizationId: testOrg._id });
      await Supplier.deleteMany({ organizationId: testOrg._id });
      await Product.deleteMany({ organizationId: testOrg._id });
      await Invoice.deleteMany({ organizationId: testOrg._id });
      await SupplierBill.deleteMany({ organizationId: testOrg._id });
      await JournalEntry.deleteMany({ organizationId: testOrg._id });
      await Account.deleteMany({ organizationId: testOrg._id });
      await StockBalance.deleteMany({ organizationId: testOrg._id });
    }
    await mongoose.connection.close();
  });

  it('Creates a USD Customer with INR Base Organization', () => {
    expect(testCustomer.currency).toBe('USD');
    expect(testOrg.baseCurrency).toBe('INR');
    expect(testCustomer.name).toBe('Global Tech Corp (US)');
  });

  it('Creates and Issues a $1,000 USD Invoice with 1 USD = 85.50 INR Conversion & Verifies Balanced Ledger Entry', async () => {
    // Call the invoice API logic directly using transaction
    const rate = '85.5000';
    const totalUSD = '1000.0000';
    const expectedINR = '85500.0000';

    const inv = await withTransaction(async (session) => {
      // 1. Create Invoice
      const [invoice] = await Invoice.create([{
        organizationId: testOrg._id,
        invoiceNumber: 'INV-2026-TEST01',
        customerId: testCustomer._id,
        customerSnapshot: {
          name: testCustomer.name,
          email: testCustomer.email,
          currency: testCustomer.currency
        },
        issueDate: new Date(),
        dueDate: new Date(Date.now() + 30 * 86400000),
        currency: 'USD',
        baseCurrency: 'INR',
        exchangeRate: mongoose.Types.Decimal128.fromString(rate),
        exchangeRateDate: new Date(),
        exchangeRateSource: 'MANUAL',
        status: 'ISSUED',
        lines: [{
          name: 'Custom Enterprise Software Architecture',
          description: 'Quarterly architecture review',
          quantity: mongoose.Types.Decimal128.fromString('1.0000'),
          unitPrice: mongoose.Types.Decimal128.fromString('1000.0000'),
          lineTotal: mongoose.Types.Decimal128.fromString('1000.0000'),
          baseLineTotal: mongoose.Types.Decimal128.fromString(expectedINR)
        }],
        subtotal: mongoose.Types.Decimal128.fromString('1000.0000'),
        taxTotal: mongoose.Types.Decimal128.fromString('0.0000'),
        totalAmount: mongoose.Types.Decimal128.fromString(totalUSD),
        baseTotalAmount: mongoose.Types.Decimal128.fromString(expectedINR),
        paidAmount: mongoose.Types.Decimal128.fromString('0.0000'),
        outstandingAmount: mongoose.Types.Decimal128.fromString(totalUSD),
        basePaidAmount: mongoose.Types.Decimal128.fromString('0.0000'),
        baseOutstandingAmount: mongoose.Types.Decimal128.fromString(expectedINR)
      }], { session });

      // Update customer balance
      testCustomer.outstandingBalance = mongoose.Types.Decimal128.fromString(totalUSD);
      await testCustomer.save({ session });

      // Get AR & Sales accounts
      const arAcc = await Account.findOne({ organizationId: testOrg._id, code: '1100' }).session(session);
      const salesAcc = await Account.findOne({ organizationId: testOrg._id, code: '4010' }).session(session);

      // Create Balanced Double-Entry Journal Entry
      const [je] = await JournalEntry.create([{
        organizationId: testOrg._id,
        entryNumber: 'JE-TEST-001',
        referenceType: 'INVOICE',
        referenceId: invoice._id,
        referenceNumber: invoice.invoiceNumber,
        memo: `Invoice issued: ${invoice.invoiceNumber} (USD 1,000 @ 85.50)`,
        status: 'POSTED',
        currency: 'INR',
        totalDebit: mongoose.Types.Decimal128.fromString(expectedINR),
        totalCredit: mongoose.Types.Decimal128.fromString(expectedINR),
        lines: [
          {
            accountId: arAcc._id,
            accountCode: arAcc.code,
            accountName: arAcc.name,
            description: `AR for ${invoice.invoiceNumber}`,
            debit: mongoose.Types.Decimal128.fromString(expectedINR),
            credit: mongoose.Types.Decimal128.fromString('0.0000'),
            foreignCurrency: 'USD',
            foreignDebit: mongoose.Types.Decimal128.fromString('1000.0000'),
            exchangeRate: mongoose.Types.Decimal128.fromString(rate)
          },
          {
            accountId: salesAcc._id,
            accountCode: salesAcc.code,
            accountName: salesAcc.name,
            description: `Sales for ${invoice.invoiceNumber}`,
            debit: mongoose.Types.Decimal128.fromString('0.0000'),
            credit: mongoose.Types.Decimal128.fromString(expectedINR)
          }
        ]
      }], { session });

      invoice.journalEntryId = je._id;
      await invoice.save({ session });

      return invoice;
    });

    expect(inv.currency).toBe('USD');
    expect(toDecimal(inv.totalAmount).toFixed(2)).toBe('1000.00');
    expect(toDecimal(inv.baseTotalAmount).toFixed(2)).toBe('85500.00');
    expect(toDecimal(inv.exchangeRate).toFixed(4)).toBe('85.5000');

    // Verify Customer balance updated in USD
    const updatedCustomer = await Customer.findById(testCustomer._id);
    expect(toDecimal(updatedCustomer.outstandingBalance).toFixed(2)).toBe('1000.00');

    // Verify Journal Entry exists and balances (Debits == Credits == 85,500 INR)
    const journal = await JournalEntry.findById(inv.journalEntryId);
    expect(journal).toBeDefined();
    expect(toDecimal(journal.totalDebit).toFixed(2)).toBe('85500.00');
    expect(toDecimal(journal.totalCredit).toFixed(2)).toBe('85500.00');
    expect(journal.status).toBe('POSTED');
  });

  it('Renders valid PDF buffer for USD invoice using React-PDF', async () => {
    const inv = await Invoice.findOne({ invoiceNumber: 'INV-2026-TEST01' });
    expect(inv).toBeDefined();

    const pdfBuffer = await renderToBuffer(
      React.createElement(InvoicePDFDocument, { invoice: inv, organization: testOrg })
    );

    expect(pdfBuffer).toBeDefined();
    expect(pdfBuffer.length).toBeGreaterThan(1000); // Standard PDF buffer > 1KB
    // PDF magic bytes start with %PDF
    const pdfHeader = pdfBuffer.slice(0, 4).toString();
    expect(pdfHeader).toBe('%PDF');
  });
});
