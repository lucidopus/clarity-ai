import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User from '@/lib/models/User';
import VerificationToken from '@/lib/models/VerificationToken';
import { generateOTP, hashOTP } from '@/lib/otp';
import { sendPasswordResetEmail } from '@/lib/email';
import { escapeRegex } from '@/lib/utils/escape-regex';
import { checkRateLimit, recordFailedAttempt, getClientIp } from '@/lib/rate-limit-auth';
import { logServerActivity } from '@/lib/serverActivityLogger';

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

    const clientIp = getClientIp(request.headers);
    const rateLimitKey = `forgot-password:${clientIp}`;
    const { limited } = checkRateLimit(rateLimitKey, 5, 15 * 60 * 1000);
    if (limited) {
      return NextResponse.json(
        { success: false, message: 'Too many requests. Please try again later.' },
        { status: 429 }
      );
    }

    // Always return the same response to prevent email enumeration
    const genericResponse = {
      success: true,
      message: 'If an account with that email exists, a reset code has been sent.',
    };

    const normalizedEmail = email.toLowerCase().trim();
    const user = await User.findOne({
      email: { $regex: new RegExp(`^${escapeRegex(normalizedEmail)}$`, 'i') },
    });

    // Record attempt for ALL requests (prevents enumeration via timing)
    recordFailedAttempt(rateLimitKey, 15 * 60 * 1000);

    if (!user || !user.emailVerified) {
      return NextResponse.json(genericResponse);
    }

    // Throttle: if a code was sent in the last 60 seconds, skip re-sending
    // (but still return generic success to avoid leaking timing info).
    const recentToken = await VerificationToken.findOne({
      userId: user._id,
      type: 'password_reset',
    }).sort({ createdAt: -1 });

    if (recentToken) {
      const ageMs = Date.now() - recentToken.createdAt.getTime();
      if (ageMs < 60 * 1000) {
        return NextResponse.json(genericResponse);
      }
    }

    // Clear any prior reset tokens so only the latest OTP is valid
    await VerificationToken.deleteMany({ userId: user._id, type: 'password_reset' });

    const otp = generateOTP();
    const tokenHash = await hashOTP(otp);

    await VerificationToken.create({
      userId: user._id,
      tokenHash,
      type: 'password_reset',
      expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
    });

    await sendPasswordResetEmail({
      to: user.email,
      name: user.firstName || user.username || 'there',
      otp,
    });

    await logServerActivity(user._id, 'password_reset_requested', {
      email: user.email.replace(/(.{2})(.*)(@.*)/, '$1***$3'),
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
