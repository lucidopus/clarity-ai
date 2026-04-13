
import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import User from '@/lib/models/User';

export async function GET(request: NextRequest) {
  try {
    const decoded = getAuthUser(request);

    // Check if user still exists in the database
    await dbConnect();
    const user = await User.findById(decoded.userId);

    if (!user) {
      return NextResponse.json({ user: null });
    }

    return NextResponse.json({
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        emailVerified: user.emailVerified ?? false,
        preferences: user.preferences || null,
      },
    });
  } catch (error) {
    console.error('Unexpected error in /api/auth/me:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
