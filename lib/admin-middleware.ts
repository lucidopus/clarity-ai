import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAuth } from './admin-auth';

/**
 * Middleware wrapper for admin-only API routes
 * Returns 401 if not authenticated
 */
export async function withAdminAuth(
  request: NextRequest,
  handler: (request: NextRequest) => Promise<NextResponse>
): Promise<NextResponse> {
  const admin = await requireAdminAuth(request);

  if (!admin) {
    return NextResponse.json(
      { success: false, message: 'Unauthorized: Admin access required' },
      { status: 401 }
    );
  }

  return handler(request);
}
