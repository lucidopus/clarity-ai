
import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import jwt, { type SignOptions } from 'jsonwebtoken';
import dbConnect from '@/lib/mongodb';
import User from '@/lib/models/User';
import { z } from 'zod';
import { checkRateLimit, recordFailedAttempt, resetRateLimit, getClientIp } from '@/lib/rate-limit-auth';

const signinSchema = z.object({
  username: z.string(), // Accepts either username or email
  password: z.string(),
  rememberMe: z.boolean().optional(),
});

export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    const body = await request.json();
    const validation = signinSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ success: false, errors: validation.error.flatten().fieldErrors }, { status: 400 });
    }

    const { username, password, rememberMe } = validation.data;

    // Rate limiting: 10 attempts per 15 minutes per IP
    const clientIp = getClientIp(request.headers);
    const rateLimitKey = `signin:${clientIp}`;
    const { limited, retryAfterMs } = checkRateLimit(rateLimitKey, 10, 15 * 60 * 1000);
    if (limited) {
      return NextResponse.json(
        { success: false, message: `Too many login attempts. Try again in ${Math.ceil(retryAfterMs / 60000)} minutes.` },
        { status: 429 }
      );
    }

    // Support login with either username or email
    const isEmail = username.includes('@');
    const user = isEmail
      ? await User.findOne({ email: { $regex: new RegExp(`^${username.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') } })
      : await User.findOne({ username });
    if (!user) {
      recordFailedAttempt(rateLimitKey, 15 * 60 * 1000);
      return NextResponse.json({ success: false, message: 'Invalid username or password' }, { status: 401 });
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      recordFailedAttempt(rateLimitKey, 15 * 60 * 1000);
      return NextResponse.json({ success: false, message: 'Invalid username or password' }, { status: 401 });
    }

    // Reset rate limit on successful login
    resetRateLimit(rateLimitKey);

    // Block unverified users — redirect them to verify their email
    if (!user.emailVerified) {
      return NextResponse.json({
        success: false,
        requiresVerification: true,
        email: user.email,
        username: user.username,
        message: 'Please verify your email before signing in.',
      }, { status: 403 });
    }

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      throw new Error('JWT_SECRET is not configured');
    }

    const jwtExpireDays = rememberMe ? process.env.JWT_REMEMBER_DAYS : process.env.JWT_EXPIRE_DAYS;
    if (!jwtExpireDays) {
      throw new Error('JWT expiration window is not configured');
    }

    const expireDays = parseInt(jwtExpireDays, 10);
    const expiresInSeconds = expireDays * 24 * 60 * 60;
    const maxAge = expiresInSeconds;

    const signOptions: SignOptions = { expiresIn: expiresInSeconds, algorithm: 'HS256' };

    const token = jwt.sign(
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
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        emailVerified: user.emailVerified ?? false,
        firstName: user.firstName,
        lastName: user.lastName,
        preferences: user.preferences || null,
      },
      rememberMe,
    });

    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV !== 'development',
      path: '/',
      maxAge: maxAge, // Use calculated maxAge (either 1 day or 30 days)
      sameSite: 'strict' as const,
    };

    response.cookies.set('jwt', token, cookieOptions);

    return response;
  } catch (error) {
    console.error('Signin Error:', error);
    return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 });
  }
}
