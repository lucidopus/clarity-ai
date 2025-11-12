import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { verifyAdminPassword, generateAdminToken } from '@/lib/admin-auth';

const loginSchema = z.object({
  password: z.string().min(1, 'Password is required'),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = loginSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { success: false, errors: validation.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { password } = validation.data;

    // Verify admin password
    const isValid = verifyAdminPassword(password);
    if (!isValid) {
      return NextResponse.json(
        { success: false, message: 'Invalid admin password' },
        { status: 401 }
      );
    }

    // Generate admin JWT token
    const token = generateAdminToken();

    const response = NextResponse.json({
      success: true,
      message: 'Admin login successful',
    });

    // Set admin JWT in httpOnly secure cookie (24 hour expiration)
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV !== 'development',
      path: '/',
      maxAge: 24 * 60 * 60, // 24 hours in seconds
    };

    response.cookies.set('admin_jwt', token, cookieOptions);

    return response;
  } catch (error) {
    console.error('Admin Login Error:', error);
    return NextResponse.json(
      { success: false, message: 'Server error' },
      { status: 500 }
    );
  }
}
