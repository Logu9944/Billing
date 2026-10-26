import { Account, OrganizationSettings, CurrencyRate } from '@/models';
import mongoose from 'mongoose';

export const STANDARD_ACCOUNTS = [
  { code: '1010', name: 'Cash on Hand', type: 'ASSET', subType: 'CASH' },
  { code: '1020', name: 'Main Bank Account', type: 'ASSET', subType: 'BANK' },
  { code: '1100', name: 'Accounts Receivable', type: 'ASSET', subType: 'ACCOUNTS_RECEIVABLE' },
  { code: '1200', name: 'Inventory Asset', type: 'ASSET', subType: 'INVENTORY_ASSET' },
  { code: '2010', name: 'Accounts Payable', type: 'LIABILITY', subType: 'ACCOUNTS_PAYABLE' },
  { code: '2020', name: 'Tax / GST Payable', type: 'LIABILITY', subType: 'TAX_PAYABLE' },
  { code: '3010', name: "Owner's Equity", type: 'EQUITY', subType: 'OWNERS_EQUITY' },
  { code: '3020', name: 'Retained Earnings', type: 'EQUITY', subType: 'RETAINED_EARNINGS' },
  { code: '4010', name: 'Sales Revenue', type: 'REVENUE', subType: 'SALES_REVENUE' },
  { code: '4090', name: 'Realized Foreign Exchange Gain', type: 'REVENUE', subType: 'EXCHANGE_GAIN' },
  { code: '5010', name: 'Cost of Goods Sold', type: 'EXPENSE', subType: 'COST_OF_GOODS_SOLD' },
  { code: '5020', name: 'General Operating Expenses', type: 'EXPENSE', subType: 'OPERATING_EXPENSE' },
  { code: '5090', name: 'Realized Foreign Exchange Loss', type: 'EXPENSE', subType: 'EXCHANGE_LOSS' }
];

/**
 * Initializes standard chart of accounts, default settings, and initial exchange rates
 * for an organization inside a transaction session.
 */
export async function initializeOrganizationDefaults(organization, session = null) {
  const orgId = organization._id;
  const baseCurrency = organization.baseCurrency || 'INR';

  // 1. Create standard accounts if they don't exist
  for (const acc of STANDARD_ACCOUNTS) {
    const existing = await Account.findOne({ organizationId: orgId, code: acc.code }).session(session);
    if (!existing) {
      await Account.create([{
        organizationId: orgId,
        code: acc.code,
        name: acc.name,
        type: acc.type,
        subType: acc.subType,
        currency: baseCurrency,
        currentBalance: mongoose.Types.Decimal128.fromString('0.0000'),
        isSystemAccount: true,
        isActive: true
      }], { session });
    }
  }

  // 2. Create organization settings
  const existingSettings = await OrganizationSettings.findOne({ organizationId: orgId }).session(session);
  if (!existingSettings) {
    await OrganizationSettings.create([{
      organizationId: orgId,
      invoicePrefix: 'INV-',
      nextInvoiceNumber: 1001,
      billPrefix: 'BILL-',
      nextBillNumber: 1001,
      paymentPrefix: 'PAY-',
      nextPaymentNumber: 1001,
      journalPrefix: 'JE-',
      nextJournalNumber: 1001,
      defaultPaymentTermsDays: 30,
      defaultTaxRate: mongoose.Types.Decimal128.fromString('18.0000'),
      autoPostInvoices: true,
      autoPostBills: true,
      exchangeRateProvider: 'MANUAL'
    }], { session });
  }

  // 3. Seed baseline currency rates (e.g., 1 USD = 85.50 INR, 1 EUR = 92.50 INR, 1 GBP = 108.00 INR)
  const initialRates = [
    { fromCurrency: 'USD', toCurrency: 'INR', rate: '85.5000' },
    { fromCurrency: 'EUR', toCurrency: 'INR', rate: '92.5000' },
    { fromCurrency: 'GBP', toCurrency: 'INR', rate: '108.0000' },
    { fromCurrency: 'INR', toCurrency: 'INR', rate: '1.0000' }
  ];

  for (const r of initialRates) {
    const existingRate = await CurrencyRate.findOne({
      organizationId: orgId,
      fromCurrency: r.fromCurrency,
      toCurrency: r.toCurrency
    }).session(session);

    if (!existingRate) {
      await CurrencyRate.create([{
        organizationId: orgId,
        fromCurrency: r.fromCurrency,
        toCurrency: r.toCurrency,
        rate: mongoose.Types.Decimal128.fromString(r.rate),
        effectiveDate: new Date(),
        source: 'MANUAL',
        notes: 'Initial standard rate'
      }], { session });
    }
  }
}
