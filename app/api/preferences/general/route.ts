import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import dbConnect from '@/lib/mongodb';
import User, { IGeneralPreferences } from '@/lib/models/User';

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
    const generalPreferences: Partial<IGeneralPreferences> = await request.json();

    // Validate boolean fields
    const validFields = ['emailNotifications', 'studyReminders', 'autoplayVideos'];
    for (const [key, value] of Object.entries(generalPreferences)) {
      if (!validFields.includes(key)) {
        return NextResponse.json({
          success: false,
          message: `Invalid field: ${key}`
        }, { status: 400 });
      }
      if (typeof value !== 'boolean') {
        return NextResponse.json({
          success: false,
          message: `${key} must be a boolean value`
        }, { status: 400 });
      }
    }

    const user = await User.findByIdAndUpdate(
      decoded.userId,
      { $set: { 'preferences.general': generalPreferences } },
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
