import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import mongoose from 'mongoose';
import dbConnect from '@/lib/mongodb';
import User from '@/lib/models/User';
import Progress from '@/lib/models/Progress';
import Flashcard from '@/lib/models/Flashcard';
import { computeReadinessScore } from '@/lib/services/readinessScore';
import { clearInsightsCache } from '@/lib/services/clarityInsights';

/**
 * POST /api/learning/flashcards/progress
 * Update flashcard mastery status in Progress collection
 */
export async function POST(request: NextRequest) {
  try {
    const decoded = getAuthUser(request);

    const body = await request.json();
    const sourceId = body.sourceId || body.videoId;
    const { flashcardId, isMastered } = body;

    if (!sourceId || !flashcardId || typeof isMastered !== 'boolean') {
      return NextResponse.json(
        { error: 'Missing required fields: sourceId (or videoId), flashcardId, isMastered' },
        { status: 400 }
      );
    }

    // Validate flashcardId is a valid ObjectId
    if (!mongoose.Types.ObjectId.isValid(flashcardId)) {
      return NextResponse.json(
        { error: 'Invalid flashcard ID format' },
        { status: 400 }
      );
    }

    await dbConnect();

    // Verify user exists
    const user = await User.findById(decoded.userId);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Verify flashcard exists and belongs to user
    const flashcard = await Flashcard.findById(flashcardId);
    if (!flashcard) {
      return NextResponse.json({ error: 'Flashcard not found' }, { status: 404 });
    }

    if (flashcard.userId.toString() !== decoded.userId) {
      return NextResponse.json(
        { error: 'You do not have permission to update this flashcard' },
        { status: 403 }
      );
    }

    // Verify flashcard belongs to the claimed source
    if (flashcard.sourceId && flashcard.sourceId.toString() !== sourceId) {
      return NextResponse.json(
        { error: 'Flashcard does not belong to the specified source' },
        { status: 403 }
      );
    }

    // Find or create progress document for this user/source combination
    let progress = await Progress.findOne({
      userId: decoded.userId,
      sourceId: sourceId
    });

    if (!progress) {
      progress = new Progress({
        userId: decoded.userId,
        sourceId: sourceId,
        masteredFlashcardIds: [],
        masteredQuizIds: [],
        quizAttempts: [],
        lastAccessedAt: new Date(),
        totalStudyTimeSeconds: 0
      });
    }

    // Update mastered flashcards array
    const flashcardObjectId = new mongoose.Types.ObjectId(flashcardId);
    const index = progress.masteredFlashcardIds.findIndex(
      (id: mongoose.Types.ObjectId) => id.toString() === flashcardId
    );

    if (isMastered && index === -1) {
      // Add to mastered list
      progress.masteredFlashcardIds.push(flashcardObjectId);
    } else if (!isMastered && index !== -1) {
      // Remove from mastered list
      progress.masteredFlashcardIds.splice(index, 1);
    }

    // Update last accessed time
    progress.lastAccessedAt = new Date();

    // Save progress
    await progress.save();

    // Recompute Clarity Score (fire-and-forget) and clear insights cache
    computeReadinessScore(decoded.userId, sourceId).catch(() => {});
    clearInsightsCache(decoded.userId);

    return NextResponse.json({
      success: true,
      message: `Flashcard ${isMastered ? 'marked as mastered' : 'unmarked'}`,
      flashcardId,
      isMastered
    });

  } catch (error) {
    console.error('Error updating flashcard progress:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
