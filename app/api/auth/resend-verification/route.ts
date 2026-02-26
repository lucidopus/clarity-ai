import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User from '@/lib/models/User';
import VerificationToken from '@/lib/models/VerificationToken';
import { generateOTP, hashOTP } from '@/lib/otp';
import { sendVerificationEmail } from '@/lib/email';
import { logServerActivity } from '@/lib/serverActivityLogger';
import { z } from 'zod';

const resendSchema = z.object({
  email: z.string().email(),
});

export async function POST(request: Request) {
  try {
    await dbConnect();
    const body = await request.json();
    const result = resendSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json({ success: false, message: 'Invalid email' }, { status: 400 });
    }

    const { email } = result.data;

    const user = await User.findOne({ email: { $regex: new RegExp(`^${email}$`, 'i') } });
    if (!user) {
      return NextResponse.json({ success: false, message: 'User not found' }, { status: 404 });
    }

    if (user.emailVerified) {
      return NextResponse.json({ success: false, message: 'Email already verified' }, { status: 400 });
    }

    // Rate limiting check
    // Find recent tokens for this user
    const recentToken = await VerificationToken.findOne({
        userId: user._id,
        type: 'email_verification'
    }).sort({ createdAt: -1 });

    if (recentToken) {
        // If created less than 1 minute ago, prevent resend
        const timeDiff = Date.now() - recentToken.createdAt.getTime();
        if (timeDiff < 60 * 1000) { // 60 seconds
            return NextResponse.json({ 
                success: false, 
                message: `Please wait ${Math.ceil((60000 - timeDiff) / 1000)}s before requesting a new code` 
            }, { status: 429 });
        }
        
        // Optional: Check resend count on the token if we were reusing tokens, 
        // but here we generate new tokens.
        // We could limit total tokens per hour here if needed.
    }

    // Generate new OTP
    const otp = generateOTP();
    const tokenHash = await hashOTP(otp);

    // Create new token
    await VerificationToken.create({
      userId: user._id,
      tokenHash,
      type: 'email_verification',
      expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
    });

    // Send email
    await sendVerificationEmail({
      to: email,
      otp,
      name: user.firstName,
    });

    await logServerActivity(user._id, 'email_verification_resent', {
      email: email.replace(/(.{2})(.*)(@.*)/, '$1***$3'),
    });

    return NextResponse.json({
      success: true,
      message: 'Verification code sent',
    });

  } catch (error) {
    console.error('Resend Verification Error:', error);
    return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 });
  }
}
