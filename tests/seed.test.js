import { describe, it, expect } from 'vitest';
import { connectDB, withTransaction } from '@/lib/db';
import { 
  Organization, 
  User, 
  OrganizationMembership, 
  Customer, 
  Supplier, 
  Product, 
  Invoice, 
  SupplierBill, 
  Payment, 
  PaymentAllocation, 
  Account, 
  JournalEntry, 
  StockBalance 
} from '@/models';
import { initializeOrganizationDefaults } from '@/lib/org-init';
import { hashPassword } from '@/lib/auth';
import { postJournalEntry, getStandardAccounts } from '@/lib/accounting-engine';
import mongoose from 'mongoose';

describe('Seed Commercial Demo Data for Levroun India Private Limited', () => {
  it('Seeds organizations, users, customers, invoices, payments and ledger', async () => {
    await connectDB();

    await withTransaction(async (session) => {
      let org = await Organization.findOne({ name: 'Levroun India Private Limited' }).session(session);
      if (!org) {
        [org] = await Organization.create([{
          name: 'Levroun India Private Limited',
          legalName: 'Levroun India Private Limited',
          taxId: '29AABCL1234F1Z5',
          baseCurrency: 'INR',
          fiscalYearStartMonth: 4,
          email: 'accounts@levroun.com',
          phone: '+91 80 4455 8899',
          website: 'https://www.levroun.com',
          address: {
            street: 'Levroun Technology Tower, Outer Ring Road',
            city: 'Bangalore',
            state: 'Karnataka',
            country: 'India',
            postalCode: '560103'
          }
        }], { session });

        await initializeOrganizationDefaults(org, session);
      }

      let user = await User.findOne({ email: 'adhurva@levroun.com' }).session(session);
      if (!user) {
        const passwordHash = await hashPassword('Password123!');
        [user] = await User.create([{
          name: 'Adhurva (Principal Architect)',
          email: 'adhurva@levroun.com',
          passwordHash,
          systemRole: 'SUPER_ADMIN'
        }], { session });

        await OrganizationMembership.create([{
          organizationId: org._id,
          userId: user._id,
          role: 'OWNER',
          isDefault: true
        }], { session });
      }

      const accounts = await getStandardAccounts(org._id, session);

      // Customer US
      const custUS = await Customer.findOneAndUpdate(
        { organizationId: org._id, code: 'CUST-US-01' },
        {
          organizationId: org._id,
          name: 'Silicon Valley Networks LLC',
          code: 'CUST-US-01',
          email: 'finance@svnetworks.com',
          currency: 'USD',
          paymentTermsDays: 30,
          creditLimit: mongoose.Types.Decimal128.fromString('50000.0000'),
          outstandingBalance: mongoose.Types.Decimal128.fromString('0.0000'),
          billingAddress: {
            street: '100 California St',
            city: 'San Francisco',
            state: 'CA',
            country: 'United States',
            postalCode: '94111'
          }
        },
        { upsert: true, new: true, session }
      );

      // Customer EU
      const custEU = await Customer.findOneAndUpdate(
        { organizationId: org._id, code: 'CUST-EU-01' },
        {
          organizationId: org._id,
          name: 'Berlin Cloud Services GmbH',
          code: 'CUST-EU-01',
          email: 'billing@berlincloud.de',
          currency: 'EUR',
          paymentTermsDays: 30,
          creditLimit: mongoose.Types.Decimal128.fromString('40000.0000'),
          outstandingBalance: mongoose.Types.Decimal128.fromString('2500.0000')
        },
        { upsert: true, new: true, session }
      );

      // Supplier
      const suppHardware = await Supplier.findOneAndUpdate(
        { organizationId: org._id, code: 'SUPP-DELL-01' },
        {
          organizationId: org._id,
          name: 'Dell Global Enterprise Infrastructure',
          code: 'SUPP-DELL-01',
          email: 'orders@dell.com',
          currency: 'INR',
          paymentTermsDays: 30,
          outstandingBalance: mongoose.Types.Decimal128.fromString('150000.0000')
        },
        { upsert: true, new: true, session }
      );

      // Product
      const prodServer = await Product.findOneAndUpdate(
        { organizationId: org._id, sku: 'SRV-RACK-01' },
        {
          organizationId: org._id,
          name: 'Enterprise Cloud Rack Server 4U',
          sku: 'SRV-RACK-01',
          type: 'GOODS',
          description: 'Intel Xeon 64-Core, 256GB ECC RAM',
          unit: 'pcs',
          purchasePrice: mongoose.Types.Decimal128.fromString('120000.0000'),
          sellingPrice: mongoose.Types.Decimal128.fromString('170000.0000'),
          taxRate: mongoose.Types.Decimal128.fromString('18.0000'),
          trackInventory: true,
          reorderLevel: 5,
          currentStock: mongoose.Types.Decimal128.fromString('18.0000')
        },
        { upsert: true, new: true, session }
      );

      // USD Invoice ($1000 @ 85.50 = 85,500 INR)
      let invUSD = await Invoice.findOne({ organizationId: org._id, invoiceNumber: 'INV-2026-1001' }).session(session);
      if (!invUSD) {
        [invUSD] = await Invoice.create([{
          organizationId: org._id,
          invoiceNumber: 'INV-2026-1001',
          customerId: custUS._id,
          customerSnapshot: { name: custUS.name, email: custUS.email, currency: 'USD' },
          issueDate: new Date(Date.now() - 5 * 86400000),
          dueDate: new Date(Date.now() + 25 * 86400000),
          currency: 'USD',
          baseCurrency: 'INR',
          exchangeRate: mongoose.Types.Decimal128.fromString('85.5000'),
          status: 'PAID',
          lines: [{
            name: 'Enterprise Financial Systems Architecture',
            sku: 'SRV-CONS-01',
            quantity: mongoose.Types.Decimal128.fromString('1.0000'),
            unitPrice: mongoose.Types.Decimal128.fromString('1000.0000'),
            lineTotal: mongoose.Types.Decimal128.fromString('1000.0000'),
            baseLineTotal: mongoose.Types.Decimal128.fromString('85500.0000')
          }],
          subtotal: mongoose.Types.Decimal128.fromString('1000.0000'),
          taxTotal: mongoose.Types.Decimal128.fromString('0.0000'),
          totalAmount: mongoose.Types.Decimal128.fromString('1000.0000'),
          baseTotalAmount: mongoose.Types.Decimal128.fromString('85500.0000'),
          paidAmount: mongoose.Types.Decimal128.fromString('1000.0000'),
          outstandingAmount: mongoose.Types.Decimal128.fromString('0.0000'),
          basePaidAmount: mongoose.Types.Decimal128.fromString('85500.0000'),
          baseOutstandingAmount: mongoose.Types.Decimal128.fromString('0.0000')
        }], { session });

        await postJournalEntry({
          organizationId: org._id,
          date: invUSD.issueDate,
          referenceType: 'INVOICE',
          referenceId: invUSD._id,
          referenceNumber: invUSD.invoiceNumber,
          memo: `Invoice ${invUSD.invoiceNumber} (${custUS.name})`,
          currency: 'INR',
          lines: [
            { accountId: accounts['1100']._id, debit: '85500.00', credit: '0.00', foreignCurrency: 'USD', foreignDebit: '1000.00', exchangeRate: '85.50' },
            { accountId: accounts['4010']._id, debit: '0.00', credit: '85500.00' }
          ],
          session
        });

        // Payment @ 86.00 = 86,000 INR into Bank -> 500 INR Gain
        const [pmtUSD] = await Payment.create([{
          organizationId: org._id,
          paymentNumber: 'PAY-2026-1001',
          type: 'RECEIPT',
          partyType: 'CUSTOMER',
          partyId: custUS._id,
          partyName: custUS.name,
          paymentDate: new Date(),
          depositAccountId: accounts['1020']._id,
          paymentCurrency: 'USD',
          paymentAmount: mongoose.Types.Decimal128.fromString('1000.0000'),
          baseCurrency: 'INR',
          exchangeRate: mongoose.Types.Decimal128.fromString('86.0000'),
          basePaymentAmount: mongoose.Types.Decimal128.fromString('86000.0000'),
          status: 'POSTED'
        }], { session });

        await PaymentAllocation.create([{
          organizationId: org._id,
          paymentId: pmtUSD._id,
          targetType: 'INVOICE',
          targetId: invUSD._id,
          targetNumber: invUSD.invoiceNumber,
          allocatedAmount: mongoose.Types.Decimal128.fromString('1000.0000'),
          documentCurrency: 'USD',
          originalExchangeRate: mongoose.Types.Decimal128.fromString('85.5000'),
          paymentExchangeRate: mongoose.Types.Decimal128.fromString('86.0000'),
          originalBaseAmount: mongoose.Types.Decimal128.fromString('85500.0000'),
          paymentBaseAmount: mongoose.Types.Decimal128.fromString('86000.0000'),
          exchangeGainLoss: mongoose.Types.Decimal128.fromString('500.0000'),
          allocatedAt: new Date()
        }], { session });

        await postJournalEntry({
          organizationId: org._id,
          date: new Date(),
          referenceType: 'PAYMENT',
          referenceId: pmtUSD._id,
          referenceNumber: pmtUSD.paymentNumber,
          memo: `Payment ${pmtUSD.paymentNumber} (${custUS.name})`,
          currency: 'INR',
          lines: [
            { accountId: accounts['1020']._id, debit: '86000.00', credit: '0.00', foreignCurrency: 'USD', foreignDebit: '1000.00', exchangeRate: '86.00' },
            { accountId: accounts['1100']._id, debit: '0.00', credit: '85500.00', foreignCurrency: 'USD', foreignCredit: '1000.00', exchangeRate: '85.50' },
            { accountId: accounts['4090']._id, debit: '0.00', credit: '500.00', description: 'Realized Foreign Exchange Gain' }
          ],
          session
        });
      }

      // EUR Invoice (€2,500 @ 92.50 = 231,250 INR)
      let invEUR = await Invoice.findOne({ organizationId: org._id, invoiceNumber: 'INV-2026-1002' }).session(session);
      if (!invEUR) {
        [invEUR] = await Invoice.create([{
          organizationId: org._id,
          invoiceNumber: 'INV-2026-1002',
          customerId: custEU._id,
          customerSnapshot: { name: custEU.name, currency: 'EUR' },
          issueDate: new Date(),
          dueDate: new Date(Date.now() + 30 * 86400000),
          currency: 'EUR',
          baseCurrency: 'INR',
          exchangeRate: mongoose.Types.Decimal128.fromString('92.5000'),
          status: 'ISSUED',
          lines: [{
            name: 'Cloud Infrastructure Architecture Delivery',
            sku: 'SRV-CONS-01',
            quantity: mongoose.Types.Decimal128.fromString('1.0000'),
            unitPrice: mongoose.Types.Decimal128.fromString('2500.0000'),
            lineTotal: mongoose.Types.Decimal128.fromString('2500.0000'),
            baseLineTotal: mongoose.Types.Decimal128.fromString('231250.0000')
          }],
          subtotal: mongoose.Types.Decimal128.fromString('2500.0000'),
          taxTotal: mongoose.Types.Decimal128.fromString('0.0000'),
          totalAmount: mongoose.Types.Decimal128.fromString('2500.0000'),
          baseTotalAmount: mongoose.Types.Decimal128.fromString('231250.0000'),
          paidAmount: mongoose.Types.Decimal128.fromString('0.0000'),
          outstandingAmount: mongoose.Types.Decimal128.fromString('2500.0000'),
          basePaidAmount: mongoose.Types.Decimal128.fromString('0.0000'),
          baseOutstandingAmount: mongoose.Types.Decimal128.fromString('231250.0000')
        }], { session });

        await postJournalEntry({
          organizationId: org._id,
          date: invEUR.issueDate,
          referenceType: 'INVOICE',
          referenceId: invEUR._id,
          referenceNumber: invEUR.invoiceNumber,
          memo: `Invoice ${invEUR.invoiceNumber} (${custEU.name})`,
          currency: 'INR',
          lines: [
            { accountId: accounts['1100']._id, debit: '231250.00', credit: '0.00', foreignCurrency: 'EUR', foreignDebit: '2500.00', exchangeRate: '92.50' },
            { accountId: accounts['4010']._id, debit: '0.00', credit: '231250.00' }
          ],
          session
        });
      }

      // Supplier Bill from Dell (₹150,000)
      let bill = await SupplierBill.findOne({ organizationId: org._id, internalBillNumber: 'BILL-2026-1001' }).session(session);
      if (!bill) {
        [bill] = await SupplierBill.create([{
          organizationId: org._id,
          billNumber: 'INV-DELL-99201',
          internalBillNumber: 'BILL-2026-1001',
          supplierId: suppHardware._id,
          supplierSnapshot: { name: suppHardware.name, currency: 'INR' },
          billDate: new Date(),
          dueDate: new Date(Date.now() + 30 * 86400000),
          currency: 'INR',
          baseCurrency: 'INR',
          exchangeRate: mongoose.Types.Decimal128.fromString('1.0000'),
          status: 'ISSUED',
          lines: [{
            description: 'Enterprise Server Component Spares and Upgrades',
            quantity: mongoose.Types.Decimal128.fromString('1.0000'),
            unitPrice: mongoose.Types.Decimal128.fromString('150000.0000'),
            lineTotal: mongoose.Types.Decimal128.fromString('150000.0000'),
            baseLineTotal: mongoose.Types.Decimal128.fromString('150000.0000')
          }],
          subtotal: mongoose.Types.Decimal128.fromString('150000.0000'),
          taxTotal: mongoose.Types.Decimal128.fromString('0.0000'),
          totalAmount: mongoose.Types.Decimal128.fromString('150000.0000'),
          baseTotalAmount: mongoose.Types.Decimal128.fromString('150000.0000'),
          paidAmount: mongoose.Types.Decimal128.fromString('0.0000'),
          outstandingAmount: mongoose.Types.Decimal128.fromString('150000.0000'),
          basePaidAmount: mongoose.Types.Decimal128.fromString('0.0000'),
          baseOutstandingAmount: mongoose.Types.Decimal128.fromString('150000.0000')
        }], { session });

        await postJournalEntry({
          organizationId: org._id,
          date: bill.billDate,
          referenceType: 'SUPPLIER_BILL',
          referenceId: bill._id,
          referenceNumber: bill.internalBillNumber,
          memo: `Supplier Bill ${bill.internalBillNumber} (${suppHardware.name})`,
          currency: 'INR',
          lines: [
            { accountId: accounts['5020']._id, debit: '150000.00', credit: '0.00' },
            { accountId: accounts['2010']._id, debit: '0.00', credit: '150000.00' }
          ],
          session
        });
      }
    });

    expect(true).toBe(true);
  });
});
