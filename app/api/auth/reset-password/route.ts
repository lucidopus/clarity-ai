import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import jwt, { type SignOptions } from 'jsonwebtoken';
import dbConnect from '@/lib/mongodb';
import User from '@/lib/models/User';
import { passwordSchema } from '@/lib/utils/auth-validation';
import { checkRateLimit, recordFailedAttempt, getClientIp } from '@/lib/rate-limit-auth';
import { logServerActivity } from '@/lib/serverActivityLogger';
import { z } from 'zod';

const resetSchema = z.object({
  resetTicket: z.string().min(1, 'Reset ticket is required'),
  newPassword: passwordSchema,
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

interface ResetTicketPayload {
  userId: string;
  email: string;
  purpose: string;
}

export async function POST(request: NextRequest) {
  try {
    await dbConnect();

    const body = await request.json();
    const parsed = resetSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          message: parsed.error.issues[0]?.message || 'Invalid input',
        },
        { status: 400 }
      );
    }

    const clientIp = getClientIp(request.headers);
    const rateLimitKey = `reset-password:${clientIp}`;
    const { limited, retryAfterMs } = checkRateLimit(rateLimitKey, 10, 15 * 60 * 1000);
    if (limited) {
      return NextResponse.json(
        {
          success: false,
          message: `Too many attempts. Try again in ${Math.ceil(retryAfterMs / 60000)} minutes.`,
        },
        { status: 429 }
      );
    }

    const { resetTicket, newPassword } = parsed.data;

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      throw new Error('JWT_SECRET is not configured');
    }

    let payload: ResetTicketPayload;
    try {
      payload = jwt.verify(resetTicket, jwtSecret, { algorithms: ['HS256'] }) as ResetTicketPayload;
    } catch {
      recordFailedAttempt(rateLimitKey, 15 * 60 * 1000);
      return NextResponse.json(
        { success: false, message: 'Your reset session has expired. Please start again.' },
        { status: 400 }
      );
    }

    if (payload.purpose !== 'password_reset' || !payload.userId) {
      recordFailedAttempt(rateLimitKey, 15 * 60 * 1000);
      return NextResponse.json(
        { success: false, message: 'Invalid reset session. Please start again.' },
        { status: 400 }
      );
    }

    const user = await User.findById(payload.userId);
    if (!user) {
      recordFailedAttempt(rateLimitKey, 15 * 60 * 1000);
      return NextResponse.json(
        { success: false, message: 'Invalid reset session. Please start again.' },
        { status: 400 }
      );
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await User.updateOne({ _id: user._id }, { $set: { passwordHash } });

    await logServerActivity(user._id, 'password_reset_completed', {
      email: user.email.replace(/(.{2})(.*)(@.*)/, '$1***$3'),
    });

    // Auto-login: issue a JWT cookie so the user is signed in immediately
    const jwtExpireDays = process.env.JWT_EXPIRE_DAYS;
    if (!jwtExpireDays) {
      throw new Error('JWT expiration window is not configured');
    }
    const expireDays = parseInt(jwtExpireDays, 10);
    const expiresInSeconds = expireDays * 24 * 60 * 60;
    const signOptions: SignOptions = { expiresIn: expiresInSeconds, algorithm: 'HS256' };

    const sessionToken = jwt.sign(
      {
        userId: user._id,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
      },
      jwtSecret,
      signOptions
    );

    const response = NextResponse.json({
      success: true,
      message: 'Password has been reset.',
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        emailVerified: user.emailVerified ?? false,
        firstName: user.firstName,
        lastName: user.lastName,
        preferences: user.preferences || null,
      },
    });

    response.cookies.set('jwt', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV !== 'development',
      path: '/',
      maxAge: expiresInSeconds,
      sameSite: 'strict' as const,
    });

    return response;
  } catch (error) {
    console.error('Reset password error:', error);
    return NextResponse.json(
      { success: false, message: 'Server error' },
      { status: 500 }
    );
  }
}
