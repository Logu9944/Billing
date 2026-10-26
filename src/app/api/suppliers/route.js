import { NextResponse } from 'next/server';
import { z } from 'zod';
import { connectDB } from '@/lib/db';
import { requireOrgContext, requireRole } from '@/lib/auth';
import { Supplier, AuditLog } from '@/models';
import { toDecimal128 } from '@/lib/decimal';
import { escapeRegex } from '@/lib/sanitize';

const SupplierSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  code: z.string().optional().default(''),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional().default(''),
  currency: z.string().length(3).default('INR'),
  taxId: z.string().optional().default(''),
  paymentTermsDays: z.number().int().min(0).default(30),
  address: z.object({
    street: z.string().optional().default(''),
    city: z.string().optional().default(''),
    state: z.string().optional().default(''),
    country: z.string().optional().default('India'),
    postalCode: z.string().optional().default('')
  }).optional().default({})
});

export async function GET(req) {
  try {
    const { organization } = await requireOrgContext(req);
    await connectDB();

    const url = new URL(req.url);
    const search = url.searchParams.get('search');
    const query = { organizationId: organization._id, isActive: true };

    if (search) {
      const safe = escapeRegex(search);
      query.$or = [
        { name: { $regex: safe, $options: 'i' } },
        { code: { $regex: safe, $options: 'i' } },
        { email: { $regex: safe, $options: 'i' } }
      ];
    }

    const suppliers = await Supplier.find(query).sort({ name: 1 }).lean();

    return NextResponse.json({
      success: true,
      data: suppliers.map(s => ({
        ...s,
        outstandingBalance: s.outstandingBalance?.toString() || '0.00'
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
    const data = SupplierSchema.parse(body);

    await connectDB();

    const supplier = await Supplier.create({
      organizationId: organization._id,
      name: data.name,
      code: data.code || `SUPP-${Date.now().toString().slice(-4)}`,
      email: data.email || '',
      phone: data.phone || '',
      currency: data.currency.toUpperCase(),
      taxId: data.taxId || '',
      paymentTermsDays: data.paymentTermsDays,
      outstandingBalance: toDecimal128(0),
      address: data.address
    });

    await AuditLog.create({
      organizationId: organization._id,
      userId: user.userId,
      userName: user.name,
      action: 'CREATE',
      entityType: 'SUPPLIER',
      entityId: supplier._id,
      description: `Created supplier ${supplier.name} (${supplier.currency})`
    });

    return NextResponse.json({ success: true, data: supplier }, { status: 201 });
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
      return NextResponse.json({ success: false, error: 'Supplier ID is required' }, { status: 400 });
    }

    await connectDB();
    const supplier = await Supplier.findOne({ _id: id, organizationId: organization._id });
    if (!supplier) {
      return NextResponse.json({ success: false, error: 'Supplier not found' }, { status: 404 });
    }

    if (updateData.name) supplier.name = updateData.name;
    if (updateData.email !== undefined) supplier.email = updateData.email;
    if (updateData.phone !== undefined) supplier.phone = updateData.phone;
    if (updateData.taxId !== undefined) supplier.taxId = updateData.taxId;
    if (updateData.paymentTermsDays !== undefined) supplier.paymentTermsDays = Number(updateData.paymentTermsDays);
    if (updateData.address) supplier.address = { ...supplier.address, ...updateData.address };

    await supplier.save();

    await AuditLog.create({
      organizationId: organization._id,
      userId: user.userId,
      userName: user.name,
      action: 'UPDATE',
      entityType: 'SUPPLIER',
      entityId: supplier._id,
      description: `Updated supplier ${supplier.name}`
    });

    return NextResponse.json({ success: true, data: supplier });
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
      return NextResponse.json({ success: false, error: 'Supplier ID is required' }, { status: 400 });
    }

    await connectDB();
    const supplier = await Supplier.findOne({ _id: id, organizationId: organization._id });
    if (!supplier) {
      return NextResponse.json({ success: false, error: 'Supplier not found' }, { status: 404 });
    }

    supplier.isActive = false;
    await supplier.save();

    await AuditLog.create({
      organizationId: organization._id,
      userId: user.userId,
      userName: user.name,
      action: 'DELETE',
      entityType: 'SUPPLIER',
      entityId: supplier._id,
      description: `Archived supplier ${supplier.name}`
    });

    return NextResponse.json({ success: true, message: 'Supplier archived successfully' });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: err.statusCode || 400 });
  }
}
