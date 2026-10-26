import mongoose from 'mongoose';
import { connectDB, withTransaction } from '../src/lib/db.js';
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
  CurrencyRate, 
  Account, 
  JournalEntry, 
  InventoryMovement, 
  StockBalance, 
  AuditLog, 
  OrganizationSettings 
} from '../src/models/index.js';
import { initializeOrganizationDefaults } from '../src/lib/org-init.js';
import { hashPassword } from '../src/lib/auth.js';
import { toDecimal, toDecimal128, financial, round } from '../src/lib/decimal.js';
import { postJournalEntry, getStandardAccounts } from '../src/lib/accounting-engine.js';

async function seed() {
  await connectDB();
  console.log('Connected to MongoDB. Starting Levroun ERP commercial seed...');

  await withTransaction(async (session) => {
    // 1. Create or Find Levroun India Organization
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

    // 2. Create User
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

    // 3. Create Customers
    const custUS = await Customer.findOneAndUpdate(
      { organizationId: org._id, code: 'CUST-US-01' },
      {
        organizationId: org._id,
        name: 'Silicon Valley Networks LLC',
        code: 'CUST-US-01',
        email: 'finance@svnetworks.com',
        phone: '+1 415 555 9021',
        currency: 'USD',
        taxId: 'US-EIN-9928190',
        paymentTermsDays: 30,
        creditLimit: mongoose.Types.Decimal128.fromString('50000.0000'),
        outstandingBalance: mongoose.Types.Decimal128.fromString('0.0000'),
        billingAddress: {
          street: '100 California Street',
          city: 'San Francisco',
          state: 'CA',
          country: 'United States',
          postalCode: '94111'
        }
      },
      { upsert: true, new: true, session }
    );

    const custEU = await Customer.findOneAndUpdate(
      { organizationId: org._id, code: 'CUST-EU-01' },
      {
        organizationId: org._id,
        name: 'Berlin Cloud Services GmbH',
        code: 'CUST-EU-01',
        email: 'billing@berlincloud.de',
        phone: '+49 30 998877',
        currency: 'EUR',
        taxId: 'DE882910293',
        paymentTermsDays: 30,
        creditLimit: mongoose.Types.Decimal128.fromString('40000.0000'),
        outstandingBalance: mongoose.Types.Decimal128.fromString('0.0000')
      },
      { upsert: true, new: true, session }
    );

    const custIN = await Customer.findOneAndUpdate(
      { organizationId: org._id, code: 'CUST-IN-01' },
      {
        organizationId: org._id,
        name: 'Tata Consultancy Enterprise',
        code: 'CUST-IN-01',
        email: 'procurement@tcs-ent.in',
        phone: '+91 22 6677 8899',
        currency: 'INR',
        taxId: '27AAACT1234F1Z1',
        paymentTermsDays: 15,
        creditLimit: mongoose.Types.Decimal128.fromString('1000000.0000'),
        outstandingBalance: mongoose.Types.Decimal128.fromString('0.0000')
      },
      { upsert: true, new: true, session }
    );

    // 4. Create Suppliers
    const suppHardware = await Supplier.findOneAndUpdate(
      { organizationId: org._id, code: 'SUPP-DELL-01' },
      {
        organizationId: org._id,
        name: 'Dell Global Enterprise Infrastructure',
        code: 'SUPP-DELL-01',
        email: 'orders@dell.com',
        phone: '+91 80 4000 1122',
        currency: 'INR',
        taxId: '29AABCD1122F1Z8',
        paymentTermsDays: 30,
        outstandingBalance: mongoose.Types.Decimal128.fromString('0.0000')
      },
      { upsert: true, new: true, session }
    );

    // 5. Create Products
    const prodServer = await Product.findOneAndUpdate(
      { organizationId: org._id, sku: 'SRV-RACK-01' },
      {
        organizationId: org._id,
        name: 'Enterprise Cloud Rack Server 4U',
        sku: 'SRV-RACK-01',
        type: 'GOODS',
        description: 'Intel Xeon 64-Core, 256GB ECC RAM, 4TB NVMe SSD',
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

    const prodConsulting = await Product.findOneAndUpdate(
      { organizationId: org._id, sku: 'SRV-CONS-01' },
      {
        organizationId: org._id,
        name: 'Enterprise Financial Systems Architecture',
        sku: 'SRV-CONS-01',
        type: 'SERVICE',
        description: 'Multi-currency ledger consulting, audit preparation, high-availability architecture',
        unit: 'hrs',
        purchasePrice: mongoose.Types.Decimal128.fromString('0.0000'),
        sellingPrice: mongoose.Types.Decimal128.fromString('12000.0000'),
        taxRate: mongoose.Types.Decimal128.fromString('18.0000'),
        trackInventory: false,
        reorderLevel: 0,
        currentStock: mongoose.Types.Decimal128.fromString('0.0000')
      },
      { upsert: true, new: true, session }
    );

    // Stock Balance for Server
    await StockBalance.findOneAndUpdate(
      { organizationId: org._id, productId: prodServer._id },
      {
        organizationId: org._id,
        productId: prodServer._id,
        currentQuantity: mongoose.Types.Decimal128.fromString('18.0000'),
        averageUnitCost: mongoose.Types.Decimal128.fromString('120000.0000'),
        totalValuation: mongoose.Types.Decimal128.fromString('2160000.0000'),
        lastUpdated: new Date()
      },
      { upsert: true, session }
    );

    // 6. Create USD Commercial Invoice ($1,000 USD @ 85.50 = 85,500 INR)
    let invUSD = await Invoice.findOne({ organizationId: org._id, invoiceNumber: 'INV-2026-1001' }).session(session);
    if (!invUSD) {
      [invUSD] = await Invoice.create([{
        organizationId: org._id,
        invoiceNumber: 'INV-2026-1001',
        customerId: custUS._id,
        customerSnapshot: {
          name: custUS.name,
          email: custUS.email,
          phone: custUS.phone,
          taxId: custUS.taxId,
          billingAddress: custUS.billingAddress
        },
        issueDate: new Date(Date.now() - 10 * 86400000),
        dueDate: new Date(Date.now() + 20 * 86400000),
        currency: 'USD',
        baseCurrency: 'INR',
        exchangeRate: mongoose.Types.Decimal128.fromString('85.5000'),
        status: 'PAID',
        lines: [{
          name: 'Enterprise Financial Systems Architecture',
          sku: 'SRV-CONS-01',
          description: 'Multi-currency ledger implementation and verification',
          quantity: mongoose.Types.Decimal128.fromString('1.0000'),
          unitPrice: mongoose.Types.Decimal128.fromString('1000.0000'),
          discountPercent: mongoose.Types.Decimal128.fromString('0.0000'),
          taxPercent: mongoose.Types.Decimal128.fromString('0.0000'),
          taxAmount: mongoose.Types.Decimal128.fromString('0.0000'),
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
        baseOutstandingAmount: mongoose.Types.Decimal128.fromString('0.0000'),
        paymentTerms: 'Net 30',
        notes: 'Thank you for your business with Levroun India Private Limited.'
      }], { session });

      // Post Invoice Journal: DR AR 85,500, CR Sales Revenue 85,500
      await postJournalEntry({
        organizationId: org._id,
        date: invUSD.issueDate,
        referenceType: 'INVOICE',
        referenceId: invUSD._id,
        referenceNumber: invUSD.invoiceNumber,
        memo: `Invoice issued: ${invUSD.invoiceNumber} (${custUS.name})`,
        currency: 'INR',
        lines: [
          {
            accountId: accounts['1100']._id,
            description: `AR: ${invUSD.invoiceNumber}`,
            debit: '85500.00',
            credit: '0.00',
            foreignCurrency: 'USD',
            foreignDebit: '1000.00',
            exchangeRate: '85.50'
          },
          {
            accountId: accounts['4010']._id,
            description: `Sales Revenue`,
            debit: '0.00',
            credit: '85500.00'
          }
        ],
        session
      });

      // Record Payment: Received $1,000 USD @ 86.00 = 86,000 INR into Bank -> Realized Gain 500 INR
      const [pmtUSD] = await Payment.create([{
        organizationId: org._id,
        paymentNumber: 'PAY-2026-1001',
        type: 'RECEIPT',
        partyType: 'CUSTOMER',
        partyId: custUS._id,
        partyName: custUS.name,
        paymentDate: new Date(),
        paymentMethod: 'BANK_TRANSFER',
        depositAccountId: accounts['1020']._id,
        paymentCurrency: 'USD',
        paymentAmount: mongoose.Types.Decimal128.fromString('1000.0000'),
        baseCurrency: 'INR',
        exchangeRate: mongoose.Types.Decimal128.fromString('86.0000'),
        basePaymentAmount: mongoose.Types.Decimal128.fromString('86000.0000'),
        reference: 'WIRE-SBI-US-99120',
        notes: 'Wire settlement via State Bank of India',
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
        memo: `Customer Remittance: ${pmtUSD.paymentNumber} (${custUS.name})`,
        currency: 'INR',
        lines: [
          { accountId: accounts['1020']._id, debit: '86000.00', credit: '0.00', foreignCurrency: 'USD', foreignDebit: '1000.00', exchangeRate: '86.00' },
          { accountId: accounts['1100']._id, debit: '0.00', credit: '85500.00', foreignCurrency: 'USD', foreignCredit: '1000.00', exchangeRate: '85.50' },
          { accountId: accounts['4090']._id, debit: '0.00', credit: '500.00', description: 'Realized Foreign Exchange Gain' }
        ],
        session
      });
    }

    // 7. Create EUR Open Invoice (€2,500 EUR @ 92.50 = 231,250 INR)
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

      custEU.outstandingBalance = mongoose.Types.Decimal128.fromString('2500.0000');
      await custEU.save({ session });

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

    // 8. Create Supplier Bill from Dell (₹150,000)
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

      suppHardware.outstandingBalance = mongoose.Types.Decimal128.fromString('150000.0000');
      await suppHardware.save({ session });

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

    console.log('Commercial demo database seeded successfully!');
  });

  await mongoose.connection.close();
}

seed().catch(err => {
  console.error('Seed error:', err);
  process.exit(1);
});
