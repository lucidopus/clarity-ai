import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import dbConnect from '@/lib/mongodb';
import User from '@/lib/models/User';
import VerificationToken from '@/lib/models/VerificationToken';
import { verifyOTP } from '@/lib/otp';
import { escapeRegex } from '@/lib/utils/escape-regex';
import { checkRateLimit, recordFailedAttempt, getClientIp } from '@/lib/rate-limit-auth';
import { logServerActivity } from '@/lib/serverActivityLogger';
import { z } from 'zod';

const verifySchema = z.object({
  email: z.string().email(),
  otp: z.string().length(6, 'Code must be 6 digits').regex(/^\d+$/, 'Code must be 6 digits'),
});

export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    const body = await request.json();
    const parsed = verifySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: 'Invalid input' },
        { status: 400 }
      );
    }

    const { email, otp } = parsed.data;

    const clientIp = getClientIp(request.headers);
    const rateLimitKey = `verify-reset-otp:${clientIp}`;
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

    const normalizedEmail = email.toLowerCase().trim();
    const user = await User.findOne({
      email: { $regex: new RegExp(`^${escapeRegex(normalizedEmail)}$`, 'i') },
    });

    if (!user) {
      recordFailedAttempt(rateLimitKey, 15 * 60 * 1000);
      return NextResponse.json(
        { success: false, message: 'Invalid or expired code' },
        { status: 400 }
      );
    }

    const token = await VerificationToken.findOne({
      userId: user._id,
      type: 'password_reset',
    }).sort({ createdAt: -1 });

    if (!token) {
      recordFailedAttempt(rateLimitKey, 15 * 60 * 1000);
      return NextResponse.json(
        { success: false, message: 'Invalid or expired code' },
        { status: 400 }
      );
    }

    if (token.expiresAt < new Date()) {
      await VerificationToken.deleteOne({ _id: token._id });
      return NextResponse.json(
        { success: false, message: 'Code has expired. Please request a new one.' },
        { status: 400 }
      );
    }

    if (token.attempts >= 5) {
      await VerificationToken.deleteOne({ _id: token._id });
      return NextResponse.json(
        { success: false, message: 'Too many failed attempts. Please request a new code.' },
        { status: 400 }
      );
    }

    const isValid = await verifyOTP(otp, token.tokenHash);
    if (!isValid) {
      token.attempts += 1;
      token.lastAttemptAt = new Date();
      await token.save();
      recordFailedAttempt(rateLimitKey, 15 * 60 * 1000);

      if (token.attempts >= 5) {
        await VerificationToken.deleteOne({ _id: token._id });
        return NextResponse.json(
          { success: false, message: 'Too many failed attempts. Please request a new code.' },
          { status: 400 }
        );
      }

      return NextResponse.json(
        { success: false, message: 'Invalid code' },
        { status: 400 }
      );
    }

    // OTP is valid — delete it so it cannot be reused, and mint a short-lived
    // reset ticket that authorizes the final password-change step.
    await VerificationToken.deleteOne({ _id: token._id });

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      throw new Error('JWT_SECRET is not configured');
    }

    const resetTicket = jwt.sign(
      {
        userId: user._id.toString(),
        email: user.email,
        purpose: 'password_reset',
      },
      jwtSecret,
      { expiresIn: '10m', algorithm: 'HS256' }
    );

    await logServerActivity(user._id, 'password_reset_otp_verified', {
      email: user.email.replace(/(.{2})(.*)(@.*)/, '$1***$3'),
    });

    return NextResponse.json({
      success: true,
      resetTicket,
    });
  } catch (error) {
    console.error('Verify reset OTP error:', error);
    return NextResponse.json(
      { success: false, message: 'Server error' },
      { status: 500 }
    );
  }
}
