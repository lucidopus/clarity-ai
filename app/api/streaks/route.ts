import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import User from '@/lib/models/User';
import StudyDay from '@/lib/models/StudyDay';
import { dayTier } from '@/lib/services/streaks';
import { resolvePendingContract } from '@/lib/services/studyContract.server';
import { internalServerError } from '@/lib/errors/apiResponse';

function getUTCDateString(): string {
  return new Date().toISOString().split('T')[0];
}

export async function GET(request: NextRequest) {
  try {
    const decoded = getAuthUser(request);
    await dbConnect();

    await resolvePendingContract(decoded.userId);

    const [user, todayDoc] = await Promise.all([
      User.findById(decoded.userId)
        .select('studyStreak longestStudyStreak streakShields milestones lastStudyDate streakRecoveryDeadline lastShieldEvent studyContract createdAt')
        .lean() as Promise<{
          studyStreak?: number;
          longestStudyStreak?: number;
          streakShields?: number;
          milestones?: number[];
          lastStudyDate?: string;
          streakRecoveryDeadline?: Date | null;
          lastShieldEvent?: { type: 'earned' | 'consumed'; at: Date } | null;
          studyContract?: {
            windowStart: string;
            windowEnd: string;
            timezone: string;
            contractedAt: Date;
            todayExtensions?: { date: string; count: number; totalMinutesAdded: number } | null;
          } | null;
          createdAt?: Date;
        } | null>,
      StudyDay.findOne({ userId: decoded.userId, date: getUTCDateString() })
        .select('qualifies fsrsQueueCleared challengesCompleted inContractWindow')
        .lean() as Promise<{
          qualifies?: boolean;
          fsrsQueueCleared?: boolean;
          challengesCompleted?: boolean;
          inContractWindow?: boolean;
        } | null>,
    ]);

    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const deadline = user.streakRecoveryDeadline ?? null;
    const isRecoveryActive = !!(deadline && deadline > new Date());

    return NextResponse.json({
      studyStreak: user.studyStreak ?? 0,
      longestStudyStreak: user.longestStudyStreak ?? 0,
      streakShields: user.streakShields ?? 0,
      milestones: user.milestones ?? [],
      lastStudyDate: user.lastStudyDate ?? null,
      todayQualifies: todayDoc?.qualifies ?? false,
      todayTier: dayTier(todayDoc),
      isRecoveryActive,
      recoveryDeadline: isRecoveryActive ? deadline : null,
      lastShieldEvent: user.lastShieldEvent ?? null,
      studyContract: user.studyContract ?? null,
      createdAt: user.createdAt ?? null,
    });
  } catch (error) {
    console.error('Error fetching streak data:', error);
    return internalServerError();
  }
}
