import jwt from 'jsonwebtoken';
import { NextRequest } from 'next/server';

// Admin JWT payload interface
export interface AdminJWTPayload {
  role: 'admin';
  iat: number;
  exp: number;
}

/**
 * Get the admin JWT secret. Requires ADMIN_JWT_SECRET — no fallback to JWT_SECRET
 * to prevent privilege escalation via regular user tokens.
 */
function getAdminSecret(): string {
  const secret = process.env.ADMIN_JWT_SECRET;
  if (!secret) {
    throw new Error('ADMIN_JWT_SECRET is required. Do not reuse JWT_SECRET — admin tokens must use a separate secret.');
  }
  return secret;
}

/**
 * Verify admin JWT token from request cookies
 */
export async function verifyAdminToken(request: NextRequest): Promise<boolean> {
  try {
    const token = request.cookies.get('admin_jwt')?.value;

    if (!token) {
      return false;
    }

    const decoded = jwt.verify(token, getAdminSecret(), {
      algorithms: ['HS256'],
    }) as AdminJWTPayload;

    // Verify it's an admin token
    return decoded.role === 'admin';
  } catch (error) {
    console.warn('Admin token verification failed:', error);
    return false;
  }
}

/**
 * Create admin JWT token
 */
export function createAdminToken(): string {
  const expiresInSeconds = 24 * 60 * 60; // 24 hours

  const token = jwt.sign(
    { role: 'admin' },
    getAdminSecret(),
    { expiresIn: expiresInSeconds, algorithm: 'HS256' }
  );

  return token;
}
