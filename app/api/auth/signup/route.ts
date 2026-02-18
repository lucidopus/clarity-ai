
import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import dbConnect from '@/lib/mongodb';
import User from '@/lib/models/User';
import VerificationToken from '@/lib/models/VerificationToken';
import { generateOTP, hashOTP } from '@/lib/otp';
import { sendVerificationEmail } from '@/lib/email';
import { z } from 'zod';

const signupSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters").max(20, "Username must be no more than 20 characters").regex(/^[a-zA-Z0-9_]+$/, "Username can only contain letters, numbers, and underscores"),
  firstName: z.string().min(1, "First name is required").max(50, "First name must be no more than 50 characters"),
  lastName: z.string().min(1, "Last name is required").max(50, "Last name must be no more than 50 characters"),
  email: z.string().regex(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/, "Please enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters").regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/, "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character"),
  confirmPassword: z.string(),
  userType: z.enum(['Graduate', 'Undergraduate', 'Other']),
  customUserType: z.string().optional(),
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
}).refine(data => {
  if (data.userType === 'Other') {
    return data.customUserType && data.customUserType.trim().length > 0;
  }
  return true;
}, {
  message: "Please specify your user type",
  path: ["customUserType"],
});

export async function POST(request: Request) {
  try {
    await dbConnect();
    const body = await request.json();
    const validation = signupSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ success: false, errors: validation.error.flatten().fieldErrors }, { status: 400 });
    }

    const { username, firstName, lastName, email, password, userType, customUserType } = validation.data;

    // Check if username already exists
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return NextResponse.json({ success: false, message: 'Username already exists' }, { status: 409 });
    }

    // Check if email already exists
    const existingEmail = await User.findOne({ email: { $regex: new RegExp(`^${email}$`, 'i') } });
    if (existingEmail) {
      return NextResponse.json({ success: false, message: 'Email is already registered' }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const newUser = await User.create({
      username,
      firstName,
      lastName,
      email,
      passwordHash,
      userType,
      customUserType: userType === 'Other' ? customUserType : undefined,
      emailVerified: false, // Explicitly set to false
    });

    console.log('New user created (unverified):', newUser._id);

    // Generate and send OTP
    const otp = generateOTP();
    const tokenHash = await hashOTP(otp);

    // Create verification token
    await VerificationToken.create({
      userId: newUser._id,
      tokenHash,
      type: 'email_verification',
      expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes from now
    });

    // Send email
    const emailSent = await sendVerificationEmail({
      to: email,
      otp,
      name: firstName,
    });

    if (!emailSent) {
      console.warn('Failed to send verification email to:', email);
      // We still return success but maybe with a warning or just let the user use "Resend" later
    }

    return NextResponse.json({
      success: true,
      requiresVerification: true,
      email: newUser.email,
      username: newUser.username,
      message: 'Account created. Please verify your email.',
    });

  } catch (error) {
    console.error('Signup Error:', error);
    return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 });
  }
}
