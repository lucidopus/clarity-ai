
import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import dbConnect from '@/lib/mongodb';
import User from '@/lib/models/User';
import { z } from 'zod';

const signinSchema = z.object({
  username: z.string(),
  password: z.string(),
  rememberMe: z.boolean().optional(),
});

export async function POST(request: Request) {
  try {
    await dbConnect();
    const body = await request.json();
    const validation = signinSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ success: false, errors: validation.error.flatten().fieldErrors }, { status: 400 });
    }

    const { username, password, rememberMe } = validation.data;

    const user = await User.findOne({ username });
    if (!user) {
      return NextResponse.json({ success: false, message: 'Invalid username or password' }, { status: 401 });
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      return NextResponse.json({ success: false, message: 'Invalid username or password' }, { status: 401 });
    }

    const expiresIn = rememberMe ? `${process.env.JWT_REMEMBER_DAYS}d` : `${process.env.JWT_EXPIRE_DAYS}d`;
    const maxAge = (rememberMe ? parseInt(process.env.JWT_REMEMBER_DAYS!) : parseInt(process.env.JWT_EXPIRE_DAYS!)) * 24 * 60 * 60;

    const token = jwt.sign(
      {
        userId: user._id,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
      },
      process.env.JWT_SECRET!,
      { expiresIn }
    );

    const response = NextResponse.json({
      success: true,
      user: {
        id: user._id,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
      },
      rememberMe,
    });

    const cookieOptions: any = {
      httpOnly: true,
      secure: process.env.NODE_ENV !== 'development',
      path: '/',
      maxAge: maxAge, // Use calculated maxAge (either 1 day or 30 days)
    };

    response.cookies.set('jwt', token, cookieOptions);

    return response;
  } catch (error) {
    console.error('Signin Error:', error);
    return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 });
  }
}
