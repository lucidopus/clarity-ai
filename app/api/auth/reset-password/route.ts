import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import dbConnect from '@/lib/mongodb';
import User from '@/lib/models/User';
import VerificationToken from '@/lib/models/VerificationToken';
import { passwordSchema } from '@/lib/utils/auth-validation';
import { checkRateLimit, recordFailedAttempt, getClientIp } from '@/lib/rate-limit-auth';

export async function POST(request: NextRequest) {
  try {
    await dbConnect();

    const body = await request.json();
    const { email, token, newPassword } = body;

    if (!email || !token || !newPassword) {
      return NextResponse.json(
        { success: false, message: 'Email, token, and new password are required' },
        { status: 400 }
      );
    }

    // Rate limit: 10 attempts per 15 minutes per IP
    const clientIp = getClientIp(request.headers);
    const rateLimit = checkRateLimit(clientIp, 10, 15);
    if (rateLimit.limited) {
      return NextResponse.json(
        { success: false, message: 'Too many attempts. Please try again later.' },
        { status: 429 }
      );
    }

    // Validate password strength
    const passwordResult = passwordSchema.safeParse(newPassword);
    if (!passwordResult.success) {
      return NextResponse.json(
        { success: false, message: passwordResult.error.issues[0].message },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      recordFailedAttempt(clientIp, 15 * 60 * 1000);
      return NextResponse.json(
        { success: false, message: 'Invalid or expired reset link' },
        { status: 400 }
      );
    }

    // Find the reset token
    const storedToken = await VerificationToken.findOne({
      userId: user._id,
      type: 'password_reset',
    });

    if (!storedToken) {
      recordFailedAttempt(clientIp, 15 * 60 * 1000);
      return NextResponse.json(
        { success: false, message: 'Invalid or expired reset link' },
        { status: 400 }
      );
    }

    // Check expiry
    if (new Date() > storedToken.expiresAt) {
      await VerificationToken.deleteOne({ _id: storedToken._id });
      return NextResponse.json(
        { success: false, message: 'Reset link has expired. Please request a new one.' },
        { status: 400 }
      );
    }

    // Track attempts (max 5 per token)
    if (storedToken.attempts >= 5) {
      await VerificationToken.deleteOne({ _id: storedToken._id });
      return NextResponse.json(
        { success: false, message: 'Too many failed attempts. Please request a new reset link.' },
        { status: 400 }
      );
    }

    // Verify token: SHA256(submitted) must match stored hash (timing-safe comparison)
    const submittedHash = crypto.createHash('sha256').update(token).digest('hex');
    const hashesMatch = crypto.timingSafeEqual(
      Buffer.from(submittedHash, 'hex'),
      Buffer.from(storedToken.tokenHash, 'hex')
    );
    if (!hashesMatch) {
      await VerificationToken.updateOne(
        { _id: storedToken._id },
        { $inc: { attempts: 1 }, $set: { lastAttemptAt: new Date() } }
      );
      recordFailedAttempt(clientIp, 15 * 60 * 1000);
      return NextResponse.json(
        { success: false, message: 'Invalid or expired reset link' },
        { status: 400 }
      );
    }

    // Token is valid — update password
    const passwordHash = await bcrypt.hash(newPassword, 10);
    await User.updateOne({ _id: user._id }, { $set: { passwordHash } });

    // Delete the used token
    await VerificationToken.deleteOne({ _id: storedToken._id });

    return NextResponse.json({
      success: true,
      message: 'Password has been reset successfully. You can now sign in.',
    });
  } catch (error) {
    console.error('Reset password error:', error);
    return NextResponse.json(
      { success: false, message: 'Server error' },
      { status: 500 }
    );
  }
}
