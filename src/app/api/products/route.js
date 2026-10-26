import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withTransaction } from '@/lib/db';
import { requireOrgContext, requireRole } from '@/lib/auth';
import { Product, StockBalance, InventoryMovement, AuditLog } from '@/models';
import { toDecimal, toDecimal128, financial } from '@/lib/decimal';
import { escapeRegex } from '@/lib/sanitize';

const ProductSchema = z.object({
  name: z.string().min(1, 'Product name is required'),
  sku: z.string().min(1, 'SKU is required'),
  type: z.enum(['GOODS', 'SERVICE']).default('GOODS'),
  description: z.string().optional().default(''),
  unit: z.string().default('pcs'),
  purchasePrice: z.union([z.number(), z.string()]).default(0),
  sellingPrice: z.union([z.number(), z.string()]),
  taxRate: z.union([z.number(), z.string()]).default(18), // 18% GST
  hsnCode: z.string().optional().default(''),
  trackInventory: z.boolean().default(true),
  reorderLevel: z.number().default(10),
  openingStock: z.union([z.number(), z.string()]).default(0)
});

export async function GET(req) {
  try {
    const { organization } = await requireOrgContext(req);
    const url = new URL(req.url);
    const search = url.searchParams.get('search');
    const query = { organizationId: organization._id, isActive: true };

    if (search) {
      const safe = escapeRegex(search);
      query.$or = [
        { name: { $regex: safe, $options: 'i' } },
        { sku: { $regex: safe, $options: 'i' } },
        { description: { $regex: safe, $options: 'i' } }
      ];
    }

    const products = await Product.find(query).sort({ name: 1 }).lean();

    return NextResponse.json({
      success: true,
      data: products.map(p => ({
        ...p,
        purchasePrice: p.purchasePrice?.toString() || '0.00',
        sellingPrice: p.sellingPrice?.toString() || '0.00',
        taxRate: p.taxRate?.toString() || '18.00',
        currentStock: p.currentStock?.toString() || '0'
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
    const data = ProductSchema.parse(body);

    const product = await withTransaction(async (session) => {
      // Check existing SKU
      const existing = await Product.findOne({
        organizationId: organization._id,
        sku: data.sku.toUpperCase()
      }).session(session);

      if (existing) {
        throw new Error(`Product with SKU "${data.sku}" already exists`);
      }

      const openingQty = data.type === 'GOODS' && data.trackInventory ? toDecimal(data.openingStock) : toDecimal(0);
      const unitCost = toDecimal(data.purchasePrice);
      const totalValuation = financial.mul(openingQty, unitCost);

      const [newProduct] = await Product.create([{
        organizationId: organization._id,
        name: data.name,
        sku: data.sku.toUpperCase(),
        type: data.type,
        description: data.description,
        unit: data.unit,
        purchasePrice: toDecimal128(data.purchasePrice),
        sellingPrice: toDecimal128(data.sellingPrice),
        taxRate: toDecimal128(data.taxRate),
        hsnCode: data.hsnCode,
        trackInventory: data.type === 'GOODS' && data.trackInventory,
        reorderLevel: data.reorderLevel,
        currentStock: toDecimal128(openingQty)
      }], { session });

      // Create StockBalance record if tracking goods
      if (newProduct.trackInventory) {
        await StockBalance.create([{
          organizationId: organization._id,
          productId: newProduct._id,
          currentQuantity: toDecimal128(openingQty),
          averageUnitCost: toDecimal128(unitCost),
          totalValuation: toDecimal128(totalValuation)
        }], { session });

        // Record opening stock movement
        if (openingQty.gt(0)) {
          await InventoryMovement.create([{
            organizationId: organization._id,
            productId: newProduct._id,
            movementType: 'OPENING_STOCK',
            quantity: toDecimal128(openingQty),
            unitCost: toDecimal128(unitCost),
            totalCost: toDecimal128(totalValuation),
            referenceType: 'OPENING_BALANCE',
            notes: 'Initial opening inventory setup'
          }], { session });
        }
      }

      await AuditLog.create([{
        organizationId: organization._id,
        userId: user.userId,
        userName: user.name,
        action: 'CREATE',
        entityType: 'PRODUCT',
        entityId: newProduct._id,
        entityNumber: newProduct.sku,
        description: `Created product ${newProduct.name} (SKU: ${newProduct.sku})`
      }], { session });

      return newProduct;
    });

    return NextResponse.json({ success: true, data: product }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: err.statusCode || 400 });
  }
}

export async function PUT(req) {
  try {
    const { user, membership, organization } = await requireOrgContext(req);
    requireRole(membership);
    const body = await req.json();
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'Product ID is required' }, { status: 400 });
    }

    const updated = await withTransaction(async (session) => {
      const product = await Product.findOne({ _id: id, organizationId: organization._id }).session(session);
      if (!product) {
        throw new Error('Product not found');
      }

      if (updateData.name) product.name = updateData.name;
      if (updateData.description !== undefined) product.description = updateData.description;
      if (updateData.unit) product.unit = updateData.unit;
      if (updateData.sellingPrice !== undefined) product.sellingPrice = toDecimal128(updateData.sellingPrice);
      if (updateData.purchasePrice !== undefined) product.purchasePrice = toDecimal128(updateData.purchasePrice);
      if (updateData.taxRate !== undefined) product.taxRate = toDecimal128(updateData.taxRate);
      if (updateData.reorderLevel !== undefined) product.reorderLevel = Number(updateData.reorderLevel);
      if (updateData.hsnCode !== undefined) product.hsnCode = updateData.hsnCode;

      await product.save({ session });

      await AuditLog.create([{
        organizationId: organization._id,
        userId: user.userId,
        userName: user.name,
        action: 'UPDATE',
        entityType: 'PRODUCT',
        entityId: product._id,
        entityNumber: product.sku,
        description: `Updated product ${product.name} (SKU: ${product.sku})`
      }], { session });

      return product;
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: err.statusCode || 400 });
  }
}

export async function DELETE(req) {
  try {
    const { user, membership, organization } = await requireOrgContext(req);
    requireRole(membership);
    const url = new URL(req.url);
    const id = url.searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'Product ID is required' }, { status: 400 });
    }

    const archived = await withTransaction(async (session) => {
      const product = await Product.findOne({ _id: id, organizationId: organization._id }).session(session);
      if (!product) {
        throw new Error('Product not found');
      }

      product.isActive = false;
      await product.save({ session });

      await AuditLog.create([{
        organizationId: organization._id,
        userId: user.userId,
        userName: user.name,
        action: 'DELETE',
        entityType: 'PRODUCT',
        entityId: product._id,
        entityNumber: product.sku,
        description: `Archived product ${product.name} (SKU: ${product.sku})`
      }], { session });

      return product;
    });

    return NextResponse.json({ success: true, message: 'Product archived successfully' });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: err.statusCode || 400 });
  }
}
