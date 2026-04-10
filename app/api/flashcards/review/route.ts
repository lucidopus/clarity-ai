import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import dbConnect from '@/lib/mongodb';
import Flashcard from '@/lib/models/Flashcard';
import FlashcardReview from '@/lib/models/FlashcardReview';
import { initFSRSCard, processReview, Rating } from '@/lib/services/fsrs';
import { recordStudyActivity } from '@/lib/services/streaks';
import { computeReadinessScore } from '@/lib/services/readinessScore';
import { clearInsightsCache } from '@/lib/services/clarityInsights';

interface DecodedToken {
  userId: string;
  username: string;
  firstName: string;
  lastName: string;
}

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('jwt')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as DecodedToken;
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

    // Recompute Clarity Score (fire-and-forget) and clear insights cache
    computeReadinessScore(decoded.userId, flashcard.sourceId).catch(() => {});
    clearInsightsCache(decoded.userId);

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
