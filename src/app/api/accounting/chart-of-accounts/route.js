import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { requireOrgContext } from '@/lib/auth';
import { Account } from '@/models';

export async function GET(req) {
  try {
    const { organization } = await requireOrgContext(req);
    await connectDB();

    const accounts = await Account.find({ organizationId: organization._id })
      .sort({ code: 1 })
      .lean();

    return NextResponse.json({
      success: true,
      data: accounts.map(a => ({
        ...a,
        currentBalance: a.currentBalance?.toString() || '0.00'
      }))
    });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: err.statusCode || 500 });
  }
}
