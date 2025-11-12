import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminToken } from '@/lib/adminAuth';

export async function GET(request: NextRequest) {
  try {
    const isAdmin = await verifyAdminToken(request);

    if (!isAdmin) {
      return NextResponse.json(
        {
          authenticated: false,
        },
        { status: 401 }
      );
    }

    return NextResponse.json({
      authenticated: true,
      role: 'admin',
    });
  } catch (error) {
    console.error('Admin verification error:', error);
    return NextResponse.json(
      {
        authenticated: false,
      },
      { status: 500 }
    );
  }
}
