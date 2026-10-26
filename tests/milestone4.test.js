import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { connectDB, withTransaction } from '@/lib/db';
import { 
  Organization, 
  Product, 
  StockBalance, 
  InventoryMovement, 
  Account, 
  JournalEntry,
  Invoice,
  Customer 
} from '@/models';
import { initializeOrganizationDefaults } from '@/lib/org-init';
import { toDecimal, financial } from '@/lib/decimal';
import { postJournalEntry, getStandardAccounts } from '@/lib/accounting-engine';
import mongoose from 'mongoose';

describe('Milestone 4: Inventory Engine, Financial Reports & Operational Dashboard', () => {
  let testOrg;
  let testProduct;

  beforeAll(async () => {
    await connectDB();

    testOrg = await withTransaction(async (session) => {
      const [org] = await Organization.create([{
        name: 'Levroun India M4 Pvt Ltd',
        legalName: 'Levroun India M4 Private Limited',
        baseCurrency: 'INR'
      }], { session });

      await initializeOrganizationDefaults(org, session);
      return org;
    });

    // Create a product with 10 units initial stock
    testProduct = await Product.create({
      organizationId: testOrg._id,
      name: 'Industrial Router Model X',
      sku: 'ROUTER-X-01',
      type: 'GOODS',
      purchasePrice: mongoose.Types.Decimal128.fromString('5000.0000'),
      sellingPrice: mongoose.Types.Decimal128.fromString('8000.0000'),
      trackInventory: true,
      currentStock: mongoose.Types.Decimal128.fromString('10.0000')
    });

    await StockBalance.create({
      organizationId: testOrg._id,
      productId: testProduct._id,
      currentQuantity: mongoose.Types.Decimal128.fromString('10.0000'),
      averageUnitCost: mongoose.Types.Decimal128.fromString('5000.0000'),
      totalValuation: mongoose.Types.Decimal128.fromString('50000.0000')
    });
  });

  afterAll(async () => {
    if (testOrg) {
      await Organization.deleteOne({ _id: testOrg._id });
      await Product.deleteMany({ organizationId: testOrg._id });
      await StockBalance.deleteMany({ organizationId: testOrg._id });
      await InventoryMovement.deleteMany({ organizationId: testOrg._id });
      await JournalEntry.deleteMany({ organizationId: testOrg._id });
      await Account.deleteMany({ organizationId: testOrg._id });
      await Invoice.deleteMany({ organizationId: testOrg._id });
      await Customer.deleteMany({ organizationId: testOrg._id });
    }
    await mongoose.connection.close();
  });

  it('Executes Stock Adjustment (ADJUSTMENT_IN) with Inventory Asset Valuation and Double-Entry Journal Entry', async () => {
    const adjustQty = toDecimal('5');
    const unitCost = toDecimal('5000');
    const valuationChange = financial.mul(adjustQty, unitCost); // 25,000 INR

    await withTransaction(async (session) => {
      const prod = await Product.findById(testProduct._id).session(session);
      const newStock = financial.add(toDecimal(prod.currentStock), adjustQty); // 15
      prod.currentStock = mongoose.Types.Decimal128.fromString(newStock.toString());
      await prod.save({ session });

      const stockBal = await StockBalance.findOne({
        organizationId: testOrg._id,
        productId: prod._id
      }).session(session);

      stockBal.currentQuantity = mongoose.Types.Decimal128.fromString(newStock.toString());
      stockBal.totalValuation = mongoose.Types.Decimal128.fromString(financial.mul(newStock, unitCost).toString());
      await stockBal.save({ session });

      // Create Movement
      const [movement] = await InventoryMovement.create([{
        organizationId: testOrg._id,
        productId: prod._id,
        movementType: 'ADJUSTMENT_IN',
        quantity: mongoose.Types.Decimal128.fromString(adjustQty.toString()),
        unitCost: mongoose.Types.Decimal128.fromString(unitCost.toString()),
        totalCost: mongoose.Types.Decimal128.fromString(valuationChange.toString()),
        referenceType: 'MANUAL_ADJUSTMENT',
        notes: 'Warehouse batch recount'
      }], { session });

      // Double-entry: DR Inventory Asset 1200, CR Expense 5020
      const accounts = await getStandardAccounts(testOrg._id, session);
      const invAssetAcc = accounts['1200'];
      const expenseAcc = accounts['5020'];

      await postJournalEntry({
        organizationId: testOrg._id,
        date: new Date(),
        referenceType: 'STOCK_ADJUSTMENT',
        referenceId: movement._id,
        referenceNumber: 'ADJ-TEST-01',
        memo: `Inventory Adjustment Stock In: ${prod.sku}`,
        currency: 'INR',
        lines: [
          {
            accountId: invAssetAcc._id,
            description: `Inventory Increase: ${prod.sku}`,
            debit: valuationChange.toString(),
            credit: '0.00'
          },
          {
            accountId: expenseAcc._id,
            description: `Inventory Adjustment Credit`,
            debit: '0.00',
            credit: valuationChange.toString()
          }
        ],
        session
      });
    });

    // Verification
    const updatedProd = await Product.findById(testProduct._id);
    expect(toDecimal(updatedProd.currentStock).toString()).toBe('15');

    const movements = await InventoryMovement.find({ productId: testProduct._id });
    expect(movements.length).toBe(1);
    expect(movements[0].movementType).toBe('ADJUSTMENT_IN');
    expect(toDecimal(movements[0].quantity).toString()).toBe('5');

    // Verify Inventory Asset Account balance increased by 25,000
    const invAcc = await Account.findOne({ organizationId: testOrg._id, code: '1200' });
    expect(toDecimal(invAcc.currentBalance).toFixed(2)).toBe('25000.00');
  });

  it('Verifies Balance Sheet Accounting Equilibrium (Assets == Liabilities + Equity)', async () => {
    // Read accounts and compute Balance Sheet
    const accounts = await Account.find({ organizationId: testOrg._id });

    let totalAssets = toDecimal(0);
    let totalLiabilities = toDecimal(0);
    let totalEquity = toDecimal(0);

    let sales = toDecimal(0);
    let expenses = toDecimal(0);

    for (const a of accounts) {
      const bal = toDecimal(a.currentBalance);
      if (a.type === 'ASSET') totalAssets = financial.add(totalAssets, bal);
      else if (a.type === 'LIABILITY') totalLiabilities = financial.add(totalLiabilities, bal);
      else if (a.type === 'EQUITY') totalEquity = financial.add(totalEquity, bal);
      else if (a.type === 'REVENUE') sales = financial.add(sales, bal);
      else if (a.type === 'EXPENSE') expenses = financial.add(expenses, bal);
    }

    const netProfit = financial.sub(sales, expenses);
    const totalLiabAndEquity = financial.add(totalLiabilities, financial.add(totalEquity, netProfit));

    const diff = financial.sub(totalAssets, totalLiabAndEquity).abs();
    expect(diff.lte(0.01)).toBe(true);
  });
});
