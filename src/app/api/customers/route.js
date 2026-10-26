import { NextResponse } from 'next/server';
import { z } from 'zod';
import { connectDB } from '@/lib/db';
import { requireOrgContext, requireRole } from '@/lib/auth';
import { Customer, AuditLog } from '@/models';
import { toDecimal128 } from '@/lib/decimal';
import { escapeRegex } from '@/lib/sanitize';

const CustomerSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  code: z.string().optional().default(''),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional().default(''),
  currency: z.string().length(3).default('INR'),
  taxId: z.string().optional().default(''),
  paymentTermsDays: z.number().int().min(0).default(30),
  creditLimit: z.number().or(z.string()).default(0),
  billingAddress: z.object({
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

    const customers = await Customer.find(query).sort({ name: 1 }).lean();

    return NextResponse.json({
      success: true,
      data: customers.map(c => ({
        ...c,
        outstandingBalance: c.outstandingBalance?.toString() || '0.00',
        creditLimit: c.creditLimit?.toString() || '0.00'
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
    const data = CustomerSchema.parse(body);

    await connectDB();

    const customer = await Customer.create({
      organizationId: organization._id,
      name: data.name,
      code: data.code || `CUST-${Date.now().toString().slice(-4)}`,
      email: data.email || '',
      phone: data.phone || '',
      currency: data.currency.toUpperCase(),
      taxId: data.taxId || '',
      paymentTermsDays: data.paymentTermsDays,
      creditLimit: toDecimal128(data.creditLimit),
      outstandingBalance: toDecimal128(0),
      billingAddress: data.billingAddress
    });

    await AuditLog.create({
      organizationId: organization._id,
      userId: user.userId,
      userName: user.name,
      action: 'CREATE',
      entityType: 'CUSTOMER',
      entityId: customer._id,
      description: `Created customer ${customer.name} (${customer.currency})`
    });

    return NextResponse.json({ success: true, data: customer }, { status: 201 });
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
      return NextResponse.json({ success: false, error: 'Customer ID is required' }, { status: 400 });
    }

    await connectDB();
    const customer = await Customer.findOne({ _id: id, organizationId: organization._id });
    if (!customer) {
      return NextResponse.json({ success: false, error: 'Customer not found' }, { status: 404 });
    }

    if (updateData.name) customer.name = updateData.name;
    if (updateData.email !== undefined) customer.email = updateData.email;
    if (updateData.phone !== undefined) customer.phone = updateData.phone;
    if (updateData.taxId !== undefined) customer.taxId = updateData.taxId;
    if (updateData.paymentTermsDays !== undefined) customer.paymentTermsDays = Number(updateData.paymentTermsDays);
    if (updateData.creditLimit !== undefined) customer.creditLimit = toDecimal128(updateData.creditLimit);
    if (updateData.billingAddress) customer.billingAddress = { ...customer.billingAddress, ...updateData.billingAddress };

    await customer.save();

    await AuditLog.create({
      organizationId: organization._id,
      userId: user.userId,
      userName: user.name,
      action: 'UPDATE',
      entityType: 'CUSTOMER',
      entityId: customer._id,
      description: `Updated customer ${customer.name}`
    });

    return NextResponse.json({ success: true, data: customer });
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
      return NextResponse.json({ success: false, error: 'Customer ID is required' }, { status: 400 });
    }

    await connectDB();
    const customer = await Customer.findOne({ _id: id, organizationId: organization._id });
    if (!customer) {
      return NextResponse.json({ success: false, error: 'Customer not found' }, { status: 404 });
    }

    customer.isActive = false;
    await customer.save();

    await AuditLog.create({
      organizationId: organization._id,
      userId: user.userId,
      userName: user.name,
      action: 'DELETE',
      entityType: 'CUSTOMER',
      entityId: customer._id,
      description: `Archived customer ${customer.name}`
    });

    return NextResponse.json({ success: true, message: 'Customer archived successfully' });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: err.statusCode || 400 });
  }
}
