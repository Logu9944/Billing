import { NextResponse } from 'next/server';
import { z } from 'zod';
import { connectDB } from '@/lib/db';
import { requireOrgContext, requireRole } from '@/lib/auth';
import { Organization, OrganizationSettings, CurrencyRate, AuditLog } from '@/models';

export async function GET(req) {
  try {
    const { organization } = await requireOrgContext(req);
    await connectDB();

    const [settings, rates] = await Promise.all([
      OrganizationSettings.findOne({ organizationId: organization._id }).lean(),
      CurrencyRate.find({ organizationId: organization._id }).sort({ effectiveDate: -1 }).lean()
    ]);

    return NextResponse.json({
      success: true,
      data: {
        organization,
        settings,
        rates: (rates || []).map(r => ({
          ...r,
          rate: r.rate?.toString() || '1.0000'
        }))
      }
    });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: err.statusCode || 500 });
  }
}

export async function PUT(req) {
  try {
    const { user, membership, organization } = await requireOrgContext(req);
    requireRole(membership, ['OWNER', 'ADMIN']);
    const body = await req.json();

    await connectDB();

    const updated = await OrganizationSettings.findOneAndUpdate(
      { organizationId: organization._id },
      { $set: body },
      { new: true, upsert: true }
    );

    await AuditLog.create({
      organizationId: organization._id,
      userId: user.userId,
      userName: user.name,
      action: 'SETTINGS_CHANGED',
      entityType: 'SETTINGS',
      description: `Updated organization settings`
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: err.statusCode || 400 });
  }
}
