import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import dbConnect from '@/lib/mongodb';
import User from '@/lib/models/User';
import VerificationToken from '@/lib/models/VerificationToken';
import { verifyOTP } from '@/lib/otp';
import { logServerActivity } from '@/lib/serverActivityLogger';
import { z } from 'zod';
import { escapeRegex } from '@/lib/utils/escape-regex';
import { checkRateLimit, recordFailedAttempt, getClientIp } from '@/lib/rate-limit-auth';

const verifySchema = z.object({
  email: z.string().email(),
  otp: z.string().length(6, "OTP must be 6 digits"),
});

export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    const body = await request.json();
    const result = verifySchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json({ success: false, message: 'Invalid input' }, { status: 400 });
    }

    const { email, otp } = result.data;

    // Rate limiting: 10 OTP verification attempts per 15 minutes per IP
    const clientIp = getClientIp(request.headers);
    const rateLimitKey = `otp-verify:${clientIp}`;
    const { limited, retryAfterMs } = checkRateLimit(rateLimitKey, 10, 15 * 60 * 1000);
    if (limited) {
      return NextResponse.json(
        { success: false, message: `Too many verification attempts. Try again in ${Math.ceil(retryAfterMs / 60000)} minutes.` },
        { status: 429 }
      );
    }

    // Find user
    const user = await User.findOne({ email: { $regex: new RegExp(`^${escapeRegex(email)}$`, 'i') } });
    if (!user) {
      return NextResponse.json({ success: false, message: 'User not found' }, { status: 404 });
    }

    if (user.emailVerified) {
      return NextResponse.json({ success: false, message: 'Email already verified' }, { status: 400 });
    }

    // Find verification token
    const token = await VerificationToken.findOne({
      userId: user._id,
      type: 'email_verification',
    }).sort({ createdAt: -1 }); // Get latest token

    if (!token) {
      return NextResponse.json({ success: false, message: 'Verification code expired or invalid' }, { status: 400 });
    }

    // Check expiration
    if (token.expiresAt < new Date()) {
        return NextResponse.json({ success: false, message: 'Verification code expired' }, { status: 400 });
    }

    // Verify OTP
    const isValid = await verifyOTP(otp, token.tokenHash);
    if (!isValid) {
      recordFailedAttempt(rateLimitKey, 15 * 60 * 1000);
      // Increment attempts
      token.attempts += 1;
      await token.save();
      
      await logServerActivity(user._id, 'email_verification_failed', {
        email: email.replace(/(.{2})(.*)(@.*)/, '$1***$3'),
        attempts: token.attempts,
      });

      if (token.attempts >= 5) {
          await VerificationToken.deleteOne({ _id: token._id });
          return NextResponse.json({ success: false, message: 'Too many failed attempts. Please request a new code.' }, { status: 400 });
      }

      return NextResponse.json({ success: false, message: 'Invalid code' }, { status: 400 });
    }

    // Valid OTP: Verify user
    user.emailVerified = true;
    await user.save();

    // Delete verification token
    await VerificationToken.deleteOne({ _id: token._id });

    await logServerActivity(user._id, 'email_verification_success', {
      email: email.replace(/(.{2})(.*)(@.*)/, '$1***$3'),
    });

    // Generate JWT and return success (log user in)
    const jwtToken = jwt.sign(
      {
        userId: user._id,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
      },
      process.env.JWT_SECRET!,
      { expiresIn: '1d', algorithm: 'HS256' }
    );

    const response = NextResponse.json({
      success: true,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        preferences: user.preferences || null,
      },
      message: 'Email verified successfully',
    });

    const maxAge = parseInt(process.env.JWT_EXPIRE_DAYS || '1') * 24 * 60 * 60;

    response.cookies.set('jwt', jwtToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV !== 'development',
      maxAge: maxAge,
      path: '/',
      sameSite: 'strict' as const,
    });

    return response;

  } catch (error) {
    console.error('Verify Email Error:', error);
    return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 });
  }
}
