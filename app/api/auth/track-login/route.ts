import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import User from '@/lib/models/User';
import { apiErrorResponse } from '@/lib/errors/apiResponse';

function daysBetween(d1: Date, d2: Date): number {
  const a = new Date(d1);
  const b = new Date(d2);
  a.setHours(0, 0, 0, 0);
  b.setHours(0, 0, 0, 0);
  const diffMs = b.getTime() - a.getTime();
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

export async function POST(request: NextRequest) {
  try {
    const decoded = getAuthUser(request);

    await dbConnect();

    const user = await User.findById(decoded.userId);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let loginStreak = user.loginStreak || 0;
    let longestStreak = user.longestStreak || 0;

    if (!user.lastLoginDate) {
      loginStreak = 1;
    } else {
      const last = new Date(user.lastLoginDate);
      const diff = daysBetween(last, today);
      if (diff === 0) {
        // same day: do not increment
      } else if (diff === 1) {
        loginStreak += 1;
      } else if (diff > 1) {
        loginStreak = 1;
      }
    }

    if (loginStreak > longestStreak) {
      longestStreak = loginStreak;
    }

    user.lastLoginDate = today;
    user.loginStreak = loginStreak;
    user.longestStreak = longestStreak;
    await user.save();

    return NextResponse.json({ success: true, currentStreak: loginStreak, longestStreak });
  } catch (error) {
    console.error('Failed to track login', error);
    return apiErrorResponse('ACTIVITY_LOG_FAILED', 500);
  }
}
