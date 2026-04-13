import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import User from '@/lib/models/User';
import StudyDay from '@/lib/models/StudyDay';

function getUTCDateString(): string {
  return new Date().toISOString().split('T')[0];
}

export async function GET(request: NextRequest) {
  try {
    const decoded = getAuthUser(request);
    await dbConnect();

    const [user, todayDoc] = await Promise.all([
      User.findById(decoded.userId)
        .select('studyStreak longestStudyStreak streakShields milestones lastStudyDate')
        .lean() as Promise<{ studyStreak?: number; longestStudyStreak?: number; streakShields?: number; milestones?: number[]; lastStudyDate?: string } | null>,
      StudyDay.findOne({ userId: decoded.userId, date: getUTCDateString() })
        .lean() as Promise<{ qualifies?: boolean } | null>,
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
