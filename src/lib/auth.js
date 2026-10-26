import bcrypt from 'bcryptjs';
import * as jose from 'jose';
import { cookies } from 'next/headers';
import { connectDB } from '@/lib/db';
import { User, OrganizationMembership, Organization } from '@/models';

const JWT_SECRET = process.env.NEXTAUTH_SECRET || 'levroun_fin_billing_super_secret_jwt_key_99881122';
const SECRET_KEY = new TextEncoder().encode(JWT_SECRET);
const COOKIE_NAME = 'fin_session';

export async function hashPassword(plainTextPassword) {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(plainTextPassword, salt);
}

export async function verifyPassword(plainTextPassword, hashedPassword) {
  return bcrypt.compare(plainTextPassword, hashedPassword);
}

export async function signSessionToken(payload) {
  return new jose.SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(SECRET_KEY);
}

export async function verifySessionToken(token) {
  try {
    const { payload } = await jose.jwtVerify(token, SECRET_KEY);
    return payload;
  } catch (err) {
    return null;
  }
}

/**
 * Retrieves the current authenticated user & active organization from cookie.
 * Supports Next.js App Router cookies()
 */
export async function getSession() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    if (!token) return null;

    const payload = await verifySessionToken(token);
    if (!payload || !payload.userId) return null;

    return payload;
  } catch (error) {
    return null;
  }
}

/**
 * Extracts and verifies session from NextRequest headers or cookies
 */
export async function getSessionFromRequest(req) {
  try {
    let token = null;

    // Check cookie
    const cookieHeader = req.headers.get('cookie') || '';
    const match = cookieHeader.match(new RegExp(`(?:^|; )${COOKIE_NAME}=([^;]*)`));
    if (match) {
      token = decodeURIComponent(match[1]);
    }

    // Check authorization header fallback
    if (!token) {
      const authHeader = req.headers.get('authorization');
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7);
      }
    }

    if (!token) return null;
    return await verifySessionToken(token);
  } catch (error) {
    return null;
  }
}

/**
 * Helper to enforce authentication in API routes
 */
export async function requireAuth(req) {
  const session = await getSessionFromRequest(req);
  if (!session || !session.userId) {
    const error = new Error('Unauthorized access');
    error.statusCode = 401;
    throw error;
  }
  return session;
}

/**
 * Enforces organization scope and returns organization & membership
 */
export async function requireOrgContext(req) {
  const session = await requireAuth(req);
  if (!session.organizationId) {
    const error = new Error('No active organization selected');
    error.statusCode = 400;
    throw error;
  }

  await connectDB();
  const membership = await OrganizationMembership.findOne({
    organizationId: session.organizationId,
    userId: session.userId
  }).populate('organizationId');

  if (!membership || !membership.organizationId) {
    const error = new Error('You do not have access to this organization');
    error.statusCode = 403;
    throw error;
  }

  return {
    user: session,
    membership,
    organization: membership.organizationId
  };
}

/**
 * Enforces role-based permissions (RBAC).
 * Prevents VIEWER or unauthorized roles from mutating records.
 */
export function requireRole(membership, allowedRoles = ['OWNER', 'ADMIN', 'ACCOUNTANT']) {
  const role = membership?.role || 'VIEWER';
  if (!allowedRoles.includes(role)) {
    const error = new Error(`Forbidden: Role "${role}" does not have write or modification permissions`);
    error.statusCode = 403;
    throw error;
  }
}
