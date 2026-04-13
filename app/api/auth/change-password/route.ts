import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import dbConnect from '@/lib/mongodb';
import User from '@/lib/models/User';
import { getAuthUser } from '@/lib/auth';
import { passwordSchema } from '@/lib/utils/auth-validation';
import { checkRateLimit, recordFailedAttempt, getClientIp } from '@/lib/rate-limit-auth';

export async function POST(request: NextRequest) {
  try {
    await dbConnect();

    const decoded = getAuthUser(request);

    // Rate limit: 10 attempts per 15 minutes per IP
    const clientIp = getClientIp(request.headers);
    const rateLimit = checkRateLimit(clientIp, 10, 15);
    if (rateLimit.limited) {
      return NextResponse.json(
        { success: false, message: 'Too many attempts. Please try again later.' },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { currentPassword, newPassword } = body;

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { success: false, message: 'Current password and new password are required' },
        { status: 400 }
      );
    }

    // Validate new password strength
    const passwordResult = passwordSchema.safeParse(newPassword);
    if (!passwordResult.success) {
      return NextResponse.json(
        { success: false, message: passwordResult.error.issues[0].message },
        { status: 400 }
      );
    }

    const user = await User.findById(decoded.userId);
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      );
    }

    // Verify current password
    const isCurrentValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isCurrentValid) {
      recordFailedAttempt(clientIp, 15 * 60 * 1000);
      return NextResponse.json(
        { success: false, message: 'Current password is incorrect' },
        { status: 401 }
      );
    }

    // Don't allow same password
    const isSamePassword = await bcrypt.compare(newPassword, user.passwordHash);
    if (isSamePassword) {
      return NextResponse.json(
        { success: false, message: 'New password must be different from current password' },
        { status: 400 }
      );
    }

    // Update password
    const passwordHash = await bcrypt.hash(newPassword, 10);
    await User.updateOne({ _id: user._id }, { $set: { passwordHash } });

    return NextResponse.json({
      success: true,
      message: 'Password changed successfully',
    });
  } catch (error) {
    console.error('Change password error:', error);
    return NextResponse.json(
      { success: false, message: 'Server error' },
      { status: 500 }
    );
  }
}
