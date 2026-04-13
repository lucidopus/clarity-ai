import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import dbConnect from '@/lib/mongodb';
import User from '@/lib/models/User';
import VerificationToken from '@/lib/models/VerificationToken';
import { sendPasswordResetEmail } from '@/lib/email';
import { checkRateLimit, recordFailedAttempt, getClientIp } from '@/lib/rate-limit-auth';

export async function POST(request: NextRequest) {
  try {
    await dbConnect();

    const body = await request.json();
    const { email } = body;

    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { success: false, message: 'Email is required' },
        { status: 400 }
      );
    }

    // Rate limit: 5 attempts per 15 minutes per IP
    const clientIp = getClientIp(request.headers);
    const rateLimit = checkRateLimit(clientIp, 5, 15);
    if (rateLimit.limited) {
      return NextResponse.json(
        { success: false, message: 'Too many requests. Please try again later.' },
        { status: 429 }
      );
    }

    // Always return the same response to prevent email enumeration
    const genericResponse = {
      success: true,
      message: 'If an account with that email exists, a password reset link has been sent.',
    };

    const normalizedEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail });

    // Record attempt for ALL requests (prevents enumeration via timing)
    recordFailedAttempt(clientIp, 15 * 60 * 1000);

    if (!user) {
      return NextResponse.json(genericResponse);
    }

    if (!user.emailVerified) {
      // Don't send reset to unverified accounts
      return NextResponse.json(genericResponse);
    }

    // Delete any existing password reset tokens for this user
    await VerificationToken.deleteMany({ userId: user._id, type: 'password_reset' });

    // Generate a secure random token
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

    // Store hashed token (expires in 1 hour)
    await VerificationToken.create({
      userId: user._id,
      tokenHash,
      type: 'password_reset',
      expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
    });

    // Build reset URL — require explicit config in production to prevent host header poisoning
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL
      || (process.env.NODE_ENV === 'production' ? undefined : request.nextUrl.origin);
    if (!baseUrl) {
      console.error('NEXT_PUBLIC_APP_URL is required in production for password reset emails');
      return NextResponse.json(genericResponse);
    }
    const resetUrl = `${baseUrl}/auth/reset-password?token=${rawToken}&email=${encodeURIComponent(normalizedEmail)}`;

    // Send email (non-blocking — still return success even if email fails)
    await sendPasswordResetEmail({
      to: normalizedEmail,
      name: user.firstName || user.username || 'there',
      resetUrl,
    });

    return NextResponse.json(genericResponse);
  } catch (error) {
    console.error('Forgot password error:', error);
    return NextResponse.json(
      { success: false, message: 'Server error' },
      { status: 500 }
    );
  }
}
