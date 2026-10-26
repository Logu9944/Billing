import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { requireOrgContext } from '@/lib/auth';
import { InventoryMovement } from '@/models';

export async function GET(req) {
  try {
    const { organization } = await requireOrgContext(req);
    await connectDB();

    const url = new URL(req.url);
    const productId = url.searchParams.get('productId');

    const query = { organizationId: organization._id };
    if (productId) query.productId = productId;

    const movements = await InventoryMovement.find(query)
      .sort({ date: -1, createdAt: -1 })
      .populate('productId', 'name sku unit')
      .lean();

    return NextResponse.json({
      success: true,
      data: movements.map(m => ({
        ...m,
        quantity: m.quantity?.toString() || '0',
        unitCost: m.unitCost?.toString() || '0.00',
        totalCost: m.totalCost?.toString() || '0.00'
      }))
    });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: err.statusCode || 500 });
  }
}
