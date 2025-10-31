import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import dbConnect from '@/lib/mongodb';
import { Video, Flashcard, Progress, User, ActivityLog } from '@/lib/models';

interface DecodedToken { userId: string }

function startOfWeek(date = new Date()): Date {
  const d = new Date(date);
  const day = d.getDay(); // 0-6 Sun-Sat
  const diff = (day === 0 ? -6 : 1) - day; // start Monday
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
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

    // Streaks
    const user = await User.findById(userId).lean();
    const currentStreak = user?.loginStreak || 0;
    const longestStreak = user?.longestStreak || 0;

    // Weekly counts
    const weekStart = startOfWeek();
    const now = new Date();
    const videosThisWeek = await Video.countDocuments({ userId, createdAt: { $gte: weekStart, $lte: now } });

    const flashcardsStudiedThisWeek = await ActivityLog.countDocuments({
      userId,
      date: { $gte: weekStart, $lte: now },
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
    });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to load stats' }, { status: 500 });
  }
}
