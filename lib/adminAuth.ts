import jwt from 'jsonwebtoken';
import { NextRequest } from 'next/server';

// Admin JWT payload interface
export interface AdminJWTPayload {
  role: 'admin';
  iat: number;
  exp: number;
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

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      throw new Error('JWT_SECRET not configured');
    }

    const decoded = jwt.verify(token, jwtSecret) as AdminJWTPayload;

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
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    throw new Error('JWT_SECRET not configured');
  }

  const expiresInSeconds = 24 * 60 * 60; // 24 hours

  const token = jwt.sign(
    { role: 'admin' },
    jwtSecret,
    { expiresIn: expiresInSeconds }
  );

  return token;
}
