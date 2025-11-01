import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import dbConnect from '@/lib/mongodb';
import { Video, Flashcard, Progress, ActivityLog } from '@/lib/models';
import mongoose from 'mongoose';

interface DecodedToken { userId: string }

function startOfWeek(date = new Date()): Date {
  const d = new Date(date);
  const day = d.getDay(); // 0-6 Sun-Sat
  const diff = (day === 0 ? -6 : 1) - day; // start Monday
  const utcDate = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate() + diff, 0, 0, 0, 0));
  return utcDate;
}

async function calculateStudyStreak(userId: string): Promise<{ current: number; longest: number }> {
  // Aggregate distinct study dates from ActivityLog (exclude video_generated as it's not active learning)
  const studyDates = await ActivityLog.aggregate([
    {
      $match: {
        userId: new mongoose.Types.ObjectId(userId),
        activityType: { $in: ['flashcard_viewed', 'quiz_completed', 'materials_viewed', 'flashcard_mastered', 'flashcard_created'] }
      }
    },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$date', timezone: 'UTC' } }
      }
    },
    { $sort: { _id: 1 } },
    { $project: { _id: 0, date: '$_id' } }
  ]);

  if (studyDates.length === 0) {
    return { current: 0, longest: 0 };
  }

  // Convert dates to Date objects (already in UTC format from aggregation)
  const dates = studyDates.map(d => new Date(d.date + 'T00:00:00.000Z'));

  // Calculate current streak (working backwards from today in UTC)
  const now = new Date();
  const today = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0));

  let currentStreak = 0;
  let longestStreak = 0;
  let tempStreak = 0;

  // Check if today or yesterday has activity
  const lastActivityDate = dates[dates.length - 1];
  const daysSinceLastActivity = Math.floor((today.getTime() - lastActivityDate.getTime()) / (1000 * 60 * 60 * 24));

  // If last activity was more than 1 day ago, streak is broken
  if (daysSinceLastActivity > 1) {
    currentStreak = 0;
  } else {
    // Calculate current streak by going backwards
    const checkDate = new Date(today);
    if (daysSinceLastActivity === 1) {
      checkDate.setUTCDate(checkDate.getUTCDate() - 1);
    }

    for (let i = dates.length - 1; i >= 0; i--) {
      const studyDate = dates[i];
      const expectedDate = new Date(checkDate);

      if (studyDate.getTime() === expectedDate.getTime()) {
        currentStreak++;
        checkDate.setUTCDate(checkDate.getUTCDate() - 1);
      } else if (studyDate.getTime() < expectedDate.getTime()) {
        // Gap found, stop counting current streak
        break;
      }
    }
  }

  // Calculate longest streak
  for (let i = 0; i < dates.length; i++) {
    if (i === 0) {
      tempStreak = 1;
    } else {
      const prevDate = dates[i - 1];
      const currDate = dates[i];
      const daysDiff = Math.floor((currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24));

      if (daysDiff === 1) {
        tempStreak++;
      } else {
        if (tempStreak > longestStreak) {
          longestStreak = tempStreak;
        }
        tempStreak = 1;
      }
    }
  }

  if (tempStreak > longestStreak) {
    longestStreak = tempStreak;
  }

  return { current: currentStreak, longest: longestStreak };
}

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('jwt')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { userId } = jwt.verify(token, process.env.JWT_SECRET!) as DecodedToken;

    await dbConnect();

    const [totalVideos, totalFlashcards, totalQuizzes] = await Promise.all([
      Video.countDocuments({ userId }),
      Flashcard.countDocuments({ userId }),
      // total distinct quizzes
      // Using Progress.quizAttempts counts attempts separately below
      // Count quizzes created
      // If quizzes are per-video per-user, count by userId
      // Fallback to counting quiz documents
      (await import('@/lib/models')).Quiz.countDocuments({ userId }),
    ]);

    // Progress-based stats
    const progresses = await Progress.find({ userId }).lean();

    let flashcardsMastered = 0;
    let totalQuizAttempts = 0;
    let totalQuizScore = 0;

    for (const p of progresses) {
      flashcardsMastered += (p.masteredFlashcardIds?.length || 0);
      for (const a of (p.quizAttempts || [])) {
        totalQuizAttempts += 1;
        totalQuizScore += a.score || 0;
      }
    }

    const masteryPercentage = totalFlashcards > 0 ? Math.round((flashcardsMastered / totalFlashcards) * 100) : 0;
    const averageQuizScore = totalQuizAttempts > 0 ? Math.round(totalQuizScore / totalQuizAttempts) : 0;

    // Study-based streaks (calculated from activity logs)
    const { current: currentStreak, longest: longestStreak } = await calculateStudyStreak(userId);

    // Weekly counts (use UTC)
    const weekStart = startOfWeek();
    const now = new Date();
    const weekEnd = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999));
    const videosThisWeek = await Video.countDocuments({ userId, createdAt: { $gte: weekStart, $lte: weekEnd } });

    const flashcardsStudiedThisWeek = await ActivityLog.countDocuments({
      userId,
      date: { $gte: weekStart, $lte: weekEnd },
      activityType: { $in: ['flashcard_viewed', 'flashcard_mastered'] },
    });

    return NextResponse.json({
      totalVideos,
      totalFlashcards,
      flashcardsMastered,
      masteryPercentage,
      totalQuizzes,
      totalQuizAttempts,
      averageQuizScore,
      currentStreak,
      longestStreak,
      videosThisWeek,
      flashcardsStudiedThisWeek,
    }, {
      headers: {
        'Cache-Control': 'no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });
  } catch (error) {
    console.error('Failed to load dashboard stats', error);
    return NextResponse.json({ error: 'Failed to load stats' }, { status: 500 });
  }
}
