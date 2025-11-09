import { NextRequest, NextResponse } from 'next/server';
import jwt, { type SignOptions } from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import dbConnect from '@/lib/mongodb';
import User from '@/lib/models/User';

interface DecodedToken {
  userId: string;
  username: string;
  firstName: string;
  lastName: string;
  iat: number;
  exp: number;
}

// Rate limiting map: userId -> { attempts: number, resetAt: Date }
const passwordAttempts = new Map<string, { attempts: number; resetAt: Date }>();

// Clean up old entries every hour
setInterval(() => {
  const now = new Date();
  for (const [userId, data] of passwordAttempts.entries()) {
    if (data.resetAt < now) {
      passwordAttempts.delete(userId);
    }
  }
}, 60 * 60 * 1000); // 1 hour

const updateProfileSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(50, 'First name must be less than 50 characters').optional(),
  lastName: z.string().min(1, 'Last name is required').max(50, 'Last name must be less than 50 characters').optional(),
  username: z.string()
    .min(3, 'Username must be at least 3 characters')
    .max(20, 'Username must be less than 20 characters')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Username can only contain letters, numbers, underscores, and hyphens')
    .optional(),
  email: z.string()
    .regex(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/, 'Please enter a valid email address')
    .optional(),
  password: z.string().optional(), // Required only when changing email
});

export async function PATCH(request: NextRequest) {
  try {
    // 1. Authenticate user
    const token = request.cookies.get('jwt')?.value;
    if (!token) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      throw new Error('JWT_SECRET is not configured');
    }

    let decoded: DecodedToken;
    try {
      decoded = jwt.verify(token, jwtSecret) as DecodedToken;
    } catch (error) {
      return NextResponse.json({ success: false, message: 'Invalid token' }, { status: 401 });
    }

    // 2. Parse and validate request body
    const body = await request.json();
    const validation = updateProfileSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({
        success: false,
        errors: validation.error.flatten().fieldErrors,
      }, { status: 400 });
    }

    const { firstName, lastName, username, email, password } = validation.data;

    // At least one field must be provided
    if (!firstName && !lastName && !username && !email) {
      return NextResponse.json({
        success: false,
        message: 'At least one field must be provided for update',
      }, { status: 400 });
    }

    await dbConnect();

    // 3. Get current user from database
    const user = await User.findById(decoded.userId);
    if (!user) {
      return NextResponse.json({ success: false, message: 'User not found' }, { status: 404 });
    }

    // 4. Check rate limiting for password verification attempts
    const rateLimitData = passwordAttempts.get(decoded.userId);
    if (rateLimitData && rateLimitData.resetAt > new Date() && rateLimitData.attempts >= 5) {
      const remainingMinutes = Math.ceil((rateLimitData.resetAt.getTime() - Date.now()) / 60000);
      return NextResponse.json({
        success: false,
        message: `Too many password attempts. Please try again in ${remainingMinutes} minute${remainingMinutes > 1 ? 's' : ''}.`,
      }, { status: 429 });
    }

    // 5. If email is being changed, verify password
    const isEmailChanging = email && email.toLowerCase() !== user.email.toLowerCase();
    if (isEmailChanging) {
      if (!password) {
        return NextResponse.json({
          success: false,
          message: 'Password verification is required to change email',
          requiresPassword: true,
        }, { status: 400 });
      }

      const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

      if (!isPasswordValid) {
        // Increment password attempt counter
        const currentData = passwordAttempts.get(decoded.userId);
        if (!currentData || currentData.resetAt < new Date()) {
          // New window or expired window
          passwordAttempts.set(decoded.userId, {
            attempts: 1,
            resetAt: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes from now
          });
        } else {
          // Increment existing window
          currentData.attempts += 1;
          passwordAttempts.set(decoded.userId, currentData);
        }

        const attemptsLeft = 5 - (passwordAttempts.get(decoded.userId)?.attempts || 0);
        return NextResponse.json({
          success: false,
          message: `Invalid password. ${attemptsLeft > 0 ? `${attemptsLeft} attempt${attemptsLeft > 1 ? 's' : ''} remaining.` : 'Too many attempts. Try again later.'}`,
        }, { status: 401 });
      }

      // Password is valid, reset attempts
      passwordAttempts.delete(decoded.userId);
    }

    // 6. If username is being changed, check uniqueness
    const isUsernameChanging = username && username.toLowerCase() !== user.username.toLowerCase();
    if (isUsernameChanging) {
      const normalizedUsername = username!.toLowerCase();
      const existingUser = await User.findOne({
        username: { $regex: new RegExp(`^${normalizedUsername}$`, 'i') },
        _id: { $ne: user._id }
      });

      if (existingUser) {
        return NextResponse.json({
          success: false,
          message: 'Username is already taken',
          field: 'username',
        }, { status: 409 });
      }
    }

    // 7. Update user fields
    if (firstName) user.firstName = firstName;
    if (lastName) user.lastName = lastName;
    if (username) user.username = username.toLowerCase(); // Normalize to lowercase
    if (email) user.email = email.toLowerCase(); // Normalize to lowercase

    await user.save();

    // 8. If username or email changed, re-issue JWT
    let newToken: string | null = null;
    const shouldReissueToken = isUsernameChanging || isEmailChanging;

    if (shouldReissueToken) {
      const jwtExpireDays = process.env.JWT_EXPIRE_DAYS || '1';
      const expireDays = parseInt(jwtExpireDays, 10);
      const expiresInSeconds = expireDays * 24 * 60 * 60;
      const maxAge = expiresInSeconds;

      const signOptions: SignOptions = { expiresIn: expiresInSeconds };

      newToken = jwt.sign(
        {
          userId: user._id,
          username: user.username,
          firstName: user.firstName,
          lastName: user.lastName,
        },
        jwtSecret,
        signOptions
      );
    }

    // 9. Prepare response
    const response = NextResponse.json({
      success: true,
      message: 'Profile updated successfully',
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        preferences: user.preferences || null,
      },
    });

    // Set new JWT cookie if token was re-issued
    if (newToken) {
      const cookieOptions = {
        httpOnly: true,
        secure: process.env.NODE_ENV !== 'development',
        path: '/',
        maxAge: parseInt(process.env.JWT_EXPIRE_DAYS || '1', 10) * 24 * 60 * 60,
      };
      response.cookies.set('jwt', newToken, cookieOptions);
    }

    return response;
  } catch (error) {
    console.error('Profile Update Error:', error);
    return NextResponse.json({
      success: false,
      message: 'Server error while updating profile',
    }, { status: 500 });
  }
}
