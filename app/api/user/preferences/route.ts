import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import dbConnect from '@/lib/mongodb';
import User, { type IUserPreferences } from '@/lib/models/User';

interface DecodedToken {
  userId: string;
  username: string;
  firstName: string;
  lastName: string;
  iat: number;
  exp: number;
}

const updatePreferencesSchema = z.object({
  emailNotifications: z.boolean().optional(),
  studyReminders: z.boolean().optional(),
  autoplayVideos: z.boolean().optional(),
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
    } catch {
      return NextResponse.json({ success: false, message: 'Invalid token' }, { status: 401 });
    }

    // 2. Parse and validate request body
    const rawBody = await request.json();
    const normalizedBody = {
      ...rawBody,
      autoplayVideos: rawBody.autoplayVideos ?? rawBody.autoPlayVideos,
    };
    const validation = updatePreferencesSchema.safeParse(normalizedBody);

    if (!validation.success) {
      return NextResponse.json({
        success: false,
        errors: validation.error.flatten().fieldErrors,
      }, { status: 400 });
    }

    const { emailNotifications, studyReminders, autoplayVideos } = validation.data;

    // At least one field must be provided
    if (emailNotifications === undefined && studyReminders === undefined && autoplayVideos === undefined) {
      return NextResponse.json({
        success: false,
        message: 'At least one preference field must be provided',
      }, { status: 400 });
    }

    await dbConnect();

    // 3. Get current user from database
    const user = await User.findById(decoded.userId);
    if (!user) {
      return NextResponse.json({ success: false, message: 'User not found' }, { status: 404 });
    }

    // 4. Initialize preferences object if it doesn't exist
    if (!user.preferences) {
      user.preferences = {} as IUserPreferences;
    }
    if (!user.preferences.general) {
      user.preferences.general = {
        emailNotifications: true,
        studyReminders: true,
        autoplayVideos: false,
      };
    }

    // 5. Update only provided fields
    if (emailNotifications !== undefined) {
      user.preferences.general.emailNotifications = emailNotifications;
    }
    if (studyReminders !== undefined) {
      user.preferences.general.studyReminders = studyReminders;
    }
    if (autoplayVideos !== undefined) {
      user.preferences.general.autoplayVideos = autoplayVideos;
    }

    // Mark the nested path as modified for Mongoose
    user.markModified('preferences.general');
    await user.save();

    // 6. Return updated preferences
    return NextResponse.json({
      success: true,
      message: 'Preferences updated successfully',
      preferences: user.preferences.general,
    });

  } catch (error) {
    console.error('Preferences Update Error:', error);
    return NextResponse.json({
      success: false,
      message: 'Server error while updating preferences',
    }, { status: 500 });
  }
}
