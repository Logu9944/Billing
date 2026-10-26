import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { requireOrgContext } from '@/lib/auth';
import { AuditLog } from '@/models';

export async function GET(req) {
  try {
    const { organization } = await requireOrgContext(req);
    await connectDB();

    const logs = await AuditLog.find({ organizationId: organization._id })
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    return NextResponse.json({
      success: true,
      data: logs
    });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: err.statusCode || 500 });
  }
}
