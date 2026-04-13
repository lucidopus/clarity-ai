import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import mongoose from 'mongoose';
import dbConnect from '@/lib/mongodb';
import Flashcard from '@/lib/models/Flashcard';
import FlashcardReview from '@/lib/models/FlashcardReview';
import { initFSRSCard, processReview, Rating } from '@/lib/services/fsrs';
import { recordStudyActivity } from '@/lib/services/streaks';
import { invalidateReadiness, invalidateUserInsights, invalidateDashStats } from '@/lib/cache';

export async function POST(request: NextRequest) {
  try {
    const decoded = getAuthUser(request);
    const { flashcardId, rating, responseTimeMs } = await request.json();

    if (!flashcardId || !rating || ![1, 2, 3, 4].includes(rating)) {
      return NextResponse.json(
        { error: 'Missing or invalid fields: flashcardId, rating (1-4)' },
        { status: 400 }
      );
    }

    await dbConnect();

    const flashcard = await Flashcard.findOne({
      _id: flashcardId,
      userId: decoded.userId,
    });

    if (!flashcard) {
      return NextResponse.json({ error: 'Flashcard not found' }, { status: 404 });
    }

    // Initialize FSRS if this card has never been reviewed
    if (!flashcard.fsrs) {
      flashcard.fsrs = initFSRSCard(flashcard.createdAt);
    }

    const scheduledFor = new Date(flashcard.fsrs.due);
    const stateBefore = flashcard.fsrs.state;
    const now = new Date();

    // Process the review and update card state
    const updatedFSRS = processReview(flashcard.fsrs, rating as Rating, now);
    flashcard.fsrs = updatedFSRS;
    await flashcard.save();

    // Log the review event
    await FlashcardReview.create({
      userId: new mongoose.Types.ObjectId(decoded.userId),
      flashcardId: flashcard._id,
      sourceId: flashcard.sourceId,
      rating,
      reviewedAt: now,
      scheduledFor,
      responseTimeMs: responseTimeMs ?? undefined,
      stateBefore,
    });

    // Record streak activity (fire-and-forget)
    recordStudyActivity(decoded.userId, 'flashcard_review').catch(() => {});

    // Invalidate stale caches so next load triggers a fresh recompute
    invalidateReadiness(decoded.userId, flashcard.sourceId).catch(() => {});
    invalidateUserInsights(decoded.userId).catch(() => {});
    invalidateDashStats(decoded.userId).catch(() => {});

    return NextResponse.json({
      success: true,
      nextDue: updatedFSRS.due,
      scheduledDays: updatedFSRS.scheduled_days,
      updatedCard: {
        id: flashcard._id,
        fsrs: updatedFSRS,
      },
    });
  } catch (error) {
    console.error('Error submitting flashcard review:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
