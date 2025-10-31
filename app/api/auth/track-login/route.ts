import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import dbConnect from '@/lib/mongodb';
import User from '@/lib/models/User';

interface DecodedToken {
  userId: string;
}

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
    const token = request.cookies.get('jwt')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as DecodedToken;

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
    return NextResponse.json({ error: 'Failed to track login' }, { status: 500 });
  }
}
