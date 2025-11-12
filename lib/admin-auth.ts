import jwt, { type SignOptions } from 'jsonwebtoken';
import { NextRequest } from 'next/server';

export interface AdminJWTPayload {
  isAdmin: true;
  iat?: number;
  exp?: number;
}

/**
 * Verify admin password against environment variable
 */
export function verifyAdminPassword(password: string): boolean {
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) {
    throw new Error('ADMIN_PASSWORD is not configured');
  }
  return password === adminPassword;
}

/**
 * Generate admin JWT token
 */
export function generateAdminToken(): string {
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    throw new Error('JWT_SECRET is not configured');
  }

  // Admin tokens expire after 24 hours
  const expiresInSeconds = 24 * 60 * 60; // 24 hours
  const signOptions: SignOptions = { expiresIn: expiresInSeconds };

  const token = jwt.sign(
    {
      isAdmin: true,
    } as AdminJWTPayload,
    jwtSecret,
    signOptions
  );

  return token;
}

/**
 * Verify admin JWT token
 */
export function verifyAdminToken(token: string): AdminJWTPayload | null {
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    throw new Error('JWT_SECRET is not configured');
  }

  try {
    const decoded = jwt.verify(token, jwtSecret) as AdminJWTPayload;
    if (decoded.isAdmin === true) {
      return decoded;
    }
    return null;
  } catch (error) {
    return null;
  }
}

/**
 * Extract and verify admin token from request cookies
 */
export function getAdminFromRequest(request: NextRequest): AdminJWTPayload | null {
  const token = request.cookies.get('admin_jwt')?.value;
  if (!token) {
    return null;
  }
  return verifyAdminToken(token);
}

/**
 * Middleware helper to check admin authentication
 * Returns admin payload if authenticated, null otherwise
 */
export async function requireAdminAuth(request: NextRequest): Promise<AdminJWTPayload | null> {
  return getAdminFromRequest(request);
}
