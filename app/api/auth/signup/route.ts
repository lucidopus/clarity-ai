
import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import dbConnect from '@/lib/mongodb';
import User from '@/lib/models/User';
import { z } from 'zod';

const signupSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters").max(20, "Username must be no more than 20 characters").regex(/^[a-zA-Z0-9_]+$/, "Username can only contain letters, numbers, and underscores"),
  firstName: z.string().min(1, "First name is required").max(50, "First name must be no more than 50 characters"),
  lastName: z.string().min(1, "Last name is required").max(50, "Last name must be no more than 50 characters"),
  email: z.string().email("Please enter a valid email address"),
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

    const existingUser = await User.findOne({ username });
    console.log('Checking for existing user:', { username, foundUser: !!existingUser });
    if (existingUser) {
      return NextResponse.json({ success: false, message: 'Username already exists' }, { status: 409 });
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
    });

    console.log('New user created:', newUser);

    const token = jwt.sign(
      {
        userId: newUser._id,
        username: newUser.username,
        firstName: newUser.firstName,
        lastName: newUser.lastName,
      },
      process.env.JWT_SECRET!,
      { expiresIn: '1d' }
    );

    const response = NextResponse.json({
      success: true,
      user: {
        id: newUser._id,
        username: newUser.username,
        email: newUser.email,
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        preferences: newUser.preferences || null,
      },
      message: 'Account created successfully',
    });

    const maxAge = parseInt(process.env.JWT_EXPIRE_DAYS || '1') * 24 * 60 * 60;

    response.cookies.set('jwt', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV !== 'development',
      maxAge: maxAge,
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Signup Error:', error);
    return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 });
  }
}
