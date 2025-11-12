import jwt from 'jsonwebtoken';
import { NextRequest } from 'next/server';
import AdminLoginAttempt from './models/AdminLoginAttempt';
import dbConnect from './mongodb';

// Admin JWT payload interface
export interface AdminJWTPayload {
  role: 'admin';
  iat: number;
  exp: number;
}

// Rate limiting configuration
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const MAX_FAILED_ATTEMPTS = 5; // Max 5 failed attempts per IP in window

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
 * Get client IP address from request
 */
export function getClientIP(request: NextRequest): string {
  // Check various headers for the real IP (handles proxies)
  const forwarded = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');

  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }

  if (realIP) {
    return realIP;
  }

  // Fallback to connection IP (may be proxy in production)
  return request.ip || 'unknown';
}

/**
 * Check if IP is rate limited for admin login attempts
 */
export async function checkRateLimit(ipAddress: string): Promise<{ allowed: boolean; remainingAttempts: number }> {
  await dbConnect();

  const windowStart = new Date(Date.now() - RATE_LIMIT_WINDOW_MS);

  // Count failed attempts in the current window
  const failedAttempts = await AdminLoginAttempt.countDocuments({
    ipAddress,
    success: false,
    timestamp: { $gte: windowStart },
  });

  const allowed = failedAttempts < MAX_FAILED_ATTEMPTS;
  const remainingAttempts = Math.max(0, MAX_FAILED_ATTEMPTS - failedAttempts);

  return { allowed, remainingAttempts };
}

/**
 * Log admin login attempt
 */
export async function logLoginAttempt(
  ipAddress: string,
  success: boolean,
  userAgent?: string
): Promise<void> {
  await dbConnect();

  await AdminLoginAttempt.create({
    ipAddress,
    success,
    timestamp: new Date(),
    userAgent,
  });

  // Clean up old attempts (older than 24 hours) to prevent collection bloat
  const cleanupThreshold = new Date(Date.now() - 24 * 60 * 60 * 1000);
  await AdminLoginAttempt.deleteMany({
    timestamp: { $lt: cleanupThreshold },
  });
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
