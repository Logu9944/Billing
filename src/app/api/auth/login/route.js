import { NextResponse } from 'next/server';
import { z } from 'zod';
import { connectDB } from '@/lib/db';
import { verifyPassword, signSessionToken } from '@/lib/auth';
import { User, OrganizationMembership, Organization, AuditLog } from '@/models';
import { checkRateLimit, recordFailedAttempt, clearRateLimit } from '@/lib/rate-limiter';

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

export async function POST(req) {
  try {
    const body = await req.json();
    const { email, password } = LoginSchema.parse(body);

    // Rate Limiting check
    const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local';
    const rateLimitKey = `login_${email.toLowerCase()}_${clientIp}`;
    const rateCheck = checkRateLimit(rateLimitKey, 5, 15 * 60 * 1000);
    if (!rateCheck.allowed) {
      return NextResponse.json({
        success: false,
        error: `Too many failed attempts. Account temporarily locked. Retry in ${rateCheck.retryAfterSec} seconds.`
      }, { status: 429 });
    }

    await connectDB();

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user || !user.isActive) {
      recordFailedAttempt(rateLimitKey);
      return NextResponse.json({ success: false, error: 'Invalid credentials' }, { status: 401 });
    }

    const isValid = await verifyPassword(password, user.passwordHash);
    if (!isValid) {
      recordFailedAttempt(rateLimitKey);
      return NextResponse.json({ success: false, error: 'Invalid credentials' }, { status: 401 });
    }

    // Login succeeded: reset rate limit attempts
    clearRateLimit(rateLimitKey);

    // Find default or first organization membership
    const membership = await OrganizationMembership.findOne({ userId: user._id })
      .sort({ isDefault: -1, createdAt: 1 })
      .populate('organizationId');

    if (!membership || !membership.organizationId) {
      return NextResponse.json({ success: false, error: 'No organization linked to this account' }, { status: 403 });
    }

    const org = membership.organizationId;

    const tokenPayload = {
      userId: user._id.toString(),
      email: user.email,
      name: user.name,
      organizationId: org._id.toString(),
      organizationName: org.name,
      baseCurrency: org.baseCurrency,
      role: membership.role
    };

    const token = await signSessionToken(tokenPayload);

    // Audit login
    await AuditLog.create({
      organizationId: org._id,
      userId: user._id,
      userName: user.name,
      action: 'LOGIN',
      entityType: 'ORGANIZATION',
      entityId: org._id,
      description: `User ${user.name} logged into ${org.name}`
    });

    const response = NextResponse.json({
      success: true,
      data: {
        user: { id: user._id.toString(), name: user.name, email: user.email },
        organization: { id: org._id.toString(), name: org.name, baseCurrency: org.baseCurrency },
        role: membership.role
      }
    });

    response.cookies.set('fin_session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7
    });

    return response;
  } catch (err) {
    return NextResponse.json({
      success: false,
      error: err.message || 'Login failed'
    }, { status: 400 });
  }
}
