import { NextRequest } from 'next/server';

export interface AuthUser {
  userId: string;
  username: string;
  firstName: string;
  lastName: string;
}

/**
 * Read authenticated user from middleware-injected headers.
 * Middleware has already verified the JWT — this just reads the decoded payload.
 * Only call in routes protected by middleware (all /api/* except public routes).
 */
export function getAuthUser(request: NextRequest): AuthUser {
  const userId = request.headers.get('x-user-id');
  if (!userId) {
    throw new Error('Authentication required — middleware should have rejected this request');
  }
  return {
    userId,
    username: request.headers.get('x-user-name') || '',
    firstName: request.headers.get('x-user-first-name') || '',
    lastName: request.headers.get('x-user-last-name') || '',
  };
}

/**
 * Assert admin access from middleware-injected headers.
 * Throws if the request was not verified as admin by middleware.
 */
export function requireAdmin(request: NextRequest): void {
  if (request.headers.get('x-admin-verified') !== 'true') {
    throw new Error('Admin access required — middleware should have rejected this request');
  }
}
