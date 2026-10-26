import { NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/auth';
import { Organization, User } from '@/models';
import { connectDB } from '@/lib/db';

export async function GET(req) {
  const session = await getSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ success: false, authenticated: false }, { status: 401 });
  }

  await connectDB();
  const org = await Organization.findById(session.organizationId);

  return NextResponse.json({
    success: true,
    authenticated: true,
    data: {
      user: {
        id: session.userId,
        name: session.name,
        email: session.email,
        role: session.role
      },
      organization: {
        id: session.organizationId,
        name: org?.name || session.organizationName,
        baseCurrency: org?.baseCurrency || session.baseCurrency || 'INR',
        taxId: org?.taxId || ''
      }
    }
  });
}
