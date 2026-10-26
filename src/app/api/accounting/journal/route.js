import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { requireOrgContext } from '@/lib/auth';
import { JournalEntry } from '@/models';

export async function GET(req) {
  try {
    const { organization } = await requireOrgContext(req);
    await connectDB();

    const url = new URL(req.url);
    const referenceType = url.searchParams.get('referenceType');

    const query = { organizationId: organization._id };
    if (referenceType) query.referenceType = referenceType;

    const entries = await JournalEntry.find(query)
      .sort({ date: -1, createdAt: -1 })
      .lean();

    return NextResponse.json({
      success: true,
      data: entries.map(je => ({
        ...je,
        totalDebit: je.totalDebit?.toString() || '0.00',
        totalCredit: je.totalCredit?.toString() || '0.00',
        lines: (je.lines || []).map(l => ({
          ...l,
          debit: l.debit?.toString() || '0.00',
          credit: l.credit?.toString() || '0.00',
          foreignDebit: l.foreignDebit?.toString() || null,
          foreignCredit: l.foreignCredit?.toString() || null,
          exchangeRate: l.exchangeRate?.toString() || null
        }))
      }))
    });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: err.statusCode || 500 });
  }
}
