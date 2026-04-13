import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import Flashcard from '@/lib/models/Flashcard';
import FlashcardReview from '@/lib/models/FlashcardReview';
import { ensureFSRSInitialized } from '@/lib/services/fsrs-migrate';

export async function GET(request: NextRequest) {
  try {
    const decoded = getAuthUser(request);
    await dbConnect();
    await ensureFSRSInitialized(decoded.userId);

    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const [totalCards, dueToday, dueThisWeek, reviewsToday, nextCard] = await Promise.all([
      Flashcard.countDocuments({ userId: decoded.userId }),
      Flashcard.countDocuments({ userId: decoded.userId, 'fsrs.due': { $lte: now } }),
      Flashcard.countDocuments({ userId: decoded.userId, 'fsrs.due': { $lte: weekFromNow } }),
      FlashcardReview.countDocuments({
        userId: decoded.userId,
        reviewedAt: { $gte: todayStart },
      }),
      Flashcard.findOne({ userId: decoded.userId, 'fsrs.due': { $gt: now } })
        .sort({ 'fsrs.due': 1 })
        .select('fsrs.due')
        .lean() as Promise<{ fsrs?: { due?: Date } } | null>,
    ]);

    // Average retention: fraction of reviews rated Good or Easy (3 or 4) in last 30 days
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const recentReviews = await FlashcardReview.find({
      userId: decoded.userId,
      reviewedAt: { $gte: thirtyDaysAgo },
    }).select('rating').lean();

    const averageRetention = recentReviews.length > 0
      ? Math.round(
          (recentReviews.filter((r) => r.rating >= 3).length / recentReviews.length) * 100
        )
      : null;

    return NextResponse.json({
      totalCards,
      dueToday,
      dueThisWeek,
      reviewsToday,
      averageRetention,
      nextReviewDate: nextCard?.fsrs?.due ?? null,
    }, {
      headers: { 'Cache-Control': 'private, max-age=120' },
    });
  } catch (error) {
    console.error('Error fetching flashcard stats:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
