import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withTransaction, connectDB } from '@/lib/db';
import { requireOrgContext, requireRole } from '@/lib/auth';
import { 
  Product, 
  StockBalance, 
  InventoryMovement, 
  AuditLog, 
  Account 
} from '@/models';
import { toDecimal, toDecimal128, financial, round } from '@/lib/decimal';
import { postJournalEntry, getStandardAccounts } from '@/lib/accounting-engine';

const AdjustmentSchema = z.object({
  productId: z.string().min(1),
  type: z.enum(['ADJUSTMENT_IN', 'ADJUSTMENT_OUT']),
  quantity: z.union([z.number(), z.string()]),
  unitCost: z.union([z.number(), z.string()]).optional(),
  reason: z.string().min(1, 'Reason is required')
});

export async function POST(req) {
  try {
    const { user, membership, organization } = await requireOrgContext(req);
    requireRole(membership);
    const body = await req.json();
    const data = AdjustmentSchema.parse(body);

    const result = await withTransaction(async (session) => {
      const product = await Product.findOne({
        _id: data.productId,
        organizationId: organization._id
      }).session(session);

      if (!product) throw new Error('Product not found');
      if (!product.trackInventory) throw new Error('Cannot adjust stock on non-tracked products or services');

      const adjustQty = toDecimal(data.quantity);
      let stockBalance = await StockBalance.findOne({
        organizationId: organization._id,
        productId: product._id
      }).session(session);

      const unitCost = data.unitCost 
        ? toDecimal(data.unitCost) 
        : (stockBalance ? toDecimal(stockBalance.averageUnitCost) : toDecimal(product.purchasePrice));

      const totalValuationChange = financial.mul(adjustQty, unitCost);
      const currentStock = toDecimal(product.currentStock);

      let newStock;
      if (data.type === 'ADJUSTMENT_IN') {
        newStock = financial.add(currentStock, adjustQty);
      } else {
        if (adjustQty.gt(currentStock)) {
          throw new Error(`Cannot adjust out ${adjustQty.toString()} ${product.unit}. Current stock is only ${currentStock.toString()} ${product.unit}`);
        }
        newStock = financial.sub(currentStock, adjustQty);
      }

      // Update Product
      product.currentStock = toDecimal128(newStock);
      await product.save({ session });

      // Update StockBalance
      if (!stockBalance) {
        stockBalance = new StockBalance({
          organizationId: organization._id,
          productId: product._id,
          currentQuantity: toDecimal128(newStock),
          averageUnitCost: toDecimal128(unitCost),
          totalValuation: toDecimal128(financial.mul(newStock, unitCost))
        });
      } else {
        stockBalance.currentQuantity = toDecimal128(newStock);
        stockBalance.totalValuation = toDecimal128(financial.mul(newStock, unitCost));
        stockBalance.lastUpdated = new Date();
      }
      await stockBalance.save({ session });

      // Record Movement
      const [movement] = await InventoryMovement.create([{
        organizationId: organization._id,
        productId: product._id,
        movementType: data.type,
        quantity: toDecimal128(adjustQty),
        unitCost: toDecimal128(unitCost),
        totalCost: toDecimal128(totalValuationChange),
        referenceType: 'MANUAL_ADJUSTMENT',
        date: new Date(),
        notes: data.reason
      }], { session });

      // Post Double-Entry to Inventory Asset and Operating Expense
      const accounts = await getStandardAccounts(organization._id, session);
      const inventoryAssetAcc = accounts['1200'] || accounts['INVENTORY_ASSET'];
      const expenseAcc = accounts['5020'] || accounts['OPERATING_EXPENSE'];

      if (inventoryAssetAcc && expenseAcc && totalValuationChange.gt(0)) {
        const isStockIn = data.type === 'ADJUSTMENT_IN';

        const journalLines = isStockIn ? [
          {
            accountId: inventoryAssetAcc._id,
            description: `Stock In: ${product.name} (+${adjustQty.toString()} ${product.unit})`,
            debit: round(totalValuationChange, 2).toString(),
            credit: '0.00'
          },
          {
            accountId: expenseAcc._id,
            description: `Inventory Adjustment Credit: ${data.reason}`,
            debit: '0.00',
            credit: round(totalValuationChange, 2).toString()
          }
        ] : [
          {
            accountId: expenseAcc._id,
            description: `Inventory Write-Off / Shrinkage: ${data.reason}`,
            debit: round(totalValuationChange, 2).toString(),
            credit: '0.00'
          },
          {
            accountId: inventoryAssetAcc._id,
            description: `Stock Out: ${product.name} (-${adjustQty.toString()} ${product.unit})`,
            debit: '0.00',
            credit: round(totalValuationChange, 2).toString()
          }
        ];

        await postJournalEntry({
          organizationId: organization._id,
          date: new Date(),
          referenceType: 'STOCK_ADJUSTMENT',
          referenceId: movement._id,
          referenceNumber: `ADJ-${movement._id.toString().slice(-6)}`,
          memo: `Inventory Adjustment: ${product.name} (${data.type})`,
          currency: organization.baseCurrency,
          lines: journalLines,
          session
        });
      }

      await AuditLog.create([{
        organizationId: organization._id,
        userId: user.userId,
        userName: user.name,
        action: 'INVENTORY_ADJUSTED',
        entityType: 'INVENTORY',
        entityId: product._id,
        entityNumber: product.sku,
        description: `Adjusted stock for ${product.name} (${data.type} ${adjustQty.toString()} ${product.unit}): ${data.reason}`
      }], { session });

      return {
        product: { id: product._id, sku: product.sku, newStock: newStock.toString() },
        movement
      };
    });

    return NextResponse.json({ success: true, data: result }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: err.statusCode || 400 });
  }
}
