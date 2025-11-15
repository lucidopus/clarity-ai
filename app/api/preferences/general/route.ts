import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import dbConnect from '@/lib/mongodb';
import User, { IGeneralPreferences } from '@/lib/models/User';

type GeneralPreferencesPayload = {
  emailNotifications?: unknown;
  studyReminders?: unknown;
  autoplayVideos?: unknown;
};

export async function GET(request: NextRequest) {
  try {
    await dbConnect();

    const token = request.cookies.get('jwt')?.value;
    if (!token) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string };
    const user = await User.findById(decoded.userId);

    if (!user) {
      return NextResponse.json({ success: false, message: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      preferences: user.preferences?.general || {
        emailNotifications: true,
        studyReminders: true,
        autoplayVideos: false,
      },
    });
  } catch (error) {
    console.error('Get general preferences error:', error);
    return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await dbConnect();

    const token = request.cookies.get('jwt')?.value;
    if (!token) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string };
    const requestBody: GeneralPreferencesPayload = await request.json();

    // Extract ONLY the three allowed boolean fields
    const generalPreferences: Partial<IGeneralPreferences> = {};

    // Only accept these three fields
    if (requestBody.emailNotifications !== undefined) {
      if (typeof requestBody.emailNotifications !== 'boolean') {
        return NextResponse.json({
          success: false,
          message: 'emailNotifications must be a boolean value'
        }, { status: 400 });
      }
      generalPreferences.emailNotifications = requestBody.emailNotifications;
    }

    if (requestBody.studyReminders !== undefined) {
      if (typeof requestBody.studyReminders !== 'boolean') {
        return NextResponse.json({
          success: false,
          message: 'studyReminders must be a boolean value'
        }, { status: 400 });
      }
      generalPreferences.studyReminders = requestBody.studyReminders;
    }

    if (requestBody.autoplayVideos !== undefined) {
      if (typeof requestBody.autoplayVideos !== 'boolean') {
        return NextResponse.json({
          success: false,
          message: 'autoplayVideos must be a boolean value'
        }, { status: 400 });
      }
      generalPreferences.autoplayVideos = requestBody.autoplayVideos;
    }

    // Ensure at least one field is being updated
    if (Object.keys(generalPreferences).length === 0) {
      return NextResponse.json({
        success: false,
        message: 'No valid preferences provided'
      }, { status: 400 });
    }

    const user = await User.findByIdAndUpdate(
      decoded.userId,
      {
        $set: { 'preferences.general': generalPreferences },
        $unset: {
          // Remove the duplicate generalPreferences field
          'preferences.generalPreferences': '',
          // Remove any unwanted fields that might exist in general
          'preferences.general.accessibility': '',
          'preferences.general.notificationsEnabled': '',
          'preferences.general.dataPrivacyLevel': '',
        }
      },
      { new: true, runValidators: true }
    );

    if (!user) {
      return NextResponse.json({ success: false, message: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'General preferences saved successfully',
      preferences: user.preferences?.general,
    });
  } catch (error) {
    console.error('Save general preferences error:', error);
    return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 });
  }
}
