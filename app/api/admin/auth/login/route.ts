import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { z } from 'zod';
import { createAdminToken } from '@/lib/adminAuth';
import { checkRateLimit, recordFailedAttempt, resetRateLimit, getClientIp } from '@/lib/rate-limit-auth';

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

    // Rate limiting: 5 attempts per 15 minutes per IP
    const clientIp = getClientIp(request.headers);
    const rateLimitKey = `admin-login:${clientIp}`;
    const { limited, retryAfterMs } = checkRateLimit(rateLimitKey, 5, 15 * 60 * 1000);
    if (limited) {
      return NextResponse.json(
        { success: false, message: `Too many login attempts. Try again in ${Math.ceil(retryAfterMs / 60000)} minutes.` },
        { status: 429 }
      );
    }

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

    // Constant-time comparison to prevent timing attacks
    const passBuffer = Buffer.from(password);
    const adminBuffer = Buffer.from(adminPassword);
    const isValid = passBuffer.length === adminBuffer.length &&
      crypto.timingSafeEqual(passBuffer, adminBuffer);

    if (!isValid) {
      recordFailedAttempt(rateLimitKey, 15 * 60 * 1000);
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid password',
        },
        { status: 401 }
      );
    }

    // Reset rate limit on successful login
    resetRateLimit(rateLimitKey);

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
      sameSite: 'strict' as const,
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
