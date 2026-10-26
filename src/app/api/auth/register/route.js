import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withTransaction } from '@/lib/db';
import { hashPassword, signSessionToken } from '@/lib/auth';
import { User, Organization, OrganizationMembership, AuditLog } from '@/models';
import { initializeOrganizationDefaults } from '@/lib/org-init';

const RegisterSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Valid email required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  organizationName: z.string().min(2, 'Organization name must be at least 2 characters'),
  baseCurrency: z.string().length(3).default('INR')
});

export async function POST(req) {
  try {
    const body = await req.json();
    const data = RegisterSchema.parse(body);

    const result = await withTransaction(async (session) => {
      // 1. Check existing user
      const existingUser = await User.findOne({ email: data.email.toLowerCase() }).session(session);
      if (existingUser) {
        throw new Error('A user with this email already exists');
      }

      // 2. Hash password & create user
      const passwordHash = await hashPassword(data.password);
      const [newUser] = await User.create([{
        name: data.name,
        email: data.email.toLowerCase(),
        passwordHash,
        systemRole: 'USER'
      }], { session });

      // 3. Create Organization
      const [newOrg] = await Organization.create([{
        name: data.organizationName,
        legalName: data.organizationName,
        baseCurrency: data.baseCurrency.toUpperCase(),
        email: data.email.toLowerCase()
      }], { session });

      // 4. Create Membership as OWNER
      const [membership] = await OrganizationMembership.create([{
        organizationId: newOrg._id,
        userId: newUser._id,
        role: 'OWNER',
        isDefault: true
      }], { session });

      // 5. Initialize Chart of Accounts, Settings, Exchange Rates
      await initializeOrganizationDefaults(newOrg, session);

      // 6. Audit Log
      await AuditLog.create([{
        organizationId: newOrg._id,
        userId: newUser._id,
        userName: newUser.name,
        action: 'CREATE',
        entityType: 'ORGANIZATION',
        entityId: newOrg._id,
        description: `Created organization ${newOrg.name} and initialized Chart of Accounts.`
      }], { session });

      return {
        user: {
          id: newUser._id.toString(),
          name: newUser.name,
          email: newUser.email
        },
        organization: {
          id: newOrg._id.toString(),
          name: newOrg.name,
          baseCurrency: newOrg.baseCurrency
        },
        role: membership.role
      };
    });

    // Generate JWT session token
    const tokenPayload = {
      userId: result.user.id,
      email: result.user.email,
      name: result.user.name,
      organizationId: result.organization.id,
      organizationName: result.organization.name,
      baseCurrency: result.organization.baseCurrency,
      role: result.role
    };

    const token = await signSessionToken(tokenPayload);

    const response = NextResponse.json({
      success: true,
      message: 'Account and organization initialized successfully',
      data: result
    }, { status: 201 });

    response.cookies.set('fin_session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7 // 7 days
    });

    return response;
  } catch (err) {
    return NextResponse.json({
      success: false,
      error: err.message || 'Registration failed'
    }, { status: 400 });
  }
}
