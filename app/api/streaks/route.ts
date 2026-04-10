import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import dbConnect from '@/lib/mongodb';
import User from '@/lib/models/User';
import StudyDay from '@/lib/models/StudyDay';

interface DecodedToken {
  userId: string;
  username: string;
  firstName: string;
  lastName: string;
}

function getUTCDateString(): string {
  return new Date().toISOString().split('T')[0];
}

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('jwt')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as DecodedToken;
    await dbConnect();

    const [user, todayDoc] = await Promise.all([
      User.findById(decoded.userId)
        .select('studyStreak longestStudyStreak streakShields milestones lastStudyDate')
        .lean(),
      StudyDay.findOne({ userId: decoded.userId, date: getUTCDateString() }).lean(),
    ]);

    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    return NextResponse.json({
      studyStreak: user.studyStreak ?? 0,
      longestStudyStreak: user.longestStudyStreak ?? 0,
      streakShields: user.streakShields ?? 0,
      milestones: user.milestones ?? [],
      lastStudyDate: user.lastStudyDate ?? null,
      todayQualifies: todayDoc?.qualifies ?? false,
    });
  } catch (error) {
    console.error('Error fetching streak data:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
