import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    // Middleware already verified the admin JWT before this handler runs.
    // If we reach here, the admin is authenticated.
    requireAdmin(request);

    return NextResponse.json({
      authenticated: true,
      role: 'admin',
    });
  } catch {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }
}
