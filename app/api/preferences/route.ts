import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import dbConnect from '@/lib/mongodb';
import User, { IUserPreferences } from '@/lib/models/User';

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
      preferences: user.preferences || null,
    });
  } catch (error) {
    console.error('Get preferences error:', error);
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
    const preferences: IUserPreferences = await request.json();

    // Basic validation
    if (!preferences.role || !preferences.learningGoals.length) {
      return NextResponse.json({ success: false, message: 'Invalid preferences data' }, { status: 400 });
    }

    const user = await User.findByIdAndUpdate(
      decoded.userId,
      { preferences },
      { new: true }
    );

    if (!user) {
      return NextResponse.json({ success: false, message: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Preferences saved successfully',
      preferences: user.preferences,
    });
  } catch (error) {
    console.error('Save preferences error:', error);
    return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 });
  }
}