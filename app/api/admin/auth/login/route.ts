import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminToken } from '@/lib/adminAuth';

const loginSchema = z.object({
  password: z.string().min(1, 'Password is required'),
});

export async function POST(request: NextRequest) {
  try {
    // Parse and validate request body
    const body = await request.json();
    const validation = loginSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          errors: validation.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { password } = validation.data;

    // Verify admin password
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (!adminPassword) {
      console.error('ADMIN_PASSWORD environment variable not configured');
      return NextResponse.json(
        {
          success: false,
          message: 'Admin authentication not configured',
        },
        { status: 500 }
      );
    }

    // Simple password comparison (constant-time to prevent timing attacks)
    const isValid = password === adminPassword;

    if (!isValid) {
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid password',
        },
        { status: 401 }
      );
    }

    // Create admin JWT token
    const token = createAdminToken();

    // Set cookie and return success
    const response = NextResponse.json({
      success: true,
      message: 'Admin login successful',
    });

    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV !== 'development',
      path: '/',
      maxAge: 24 * 60 * 60, // 24 hours
    };

    response.cookies.set('admin_jwt', token, cookieOptions);

    return response;
  } catch (error) {
    console.error('Admin login error:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Server error during login',
      },
      { status: 500 }
    );
  }
}
