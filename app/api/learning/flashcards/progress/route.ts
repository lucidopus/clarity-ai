import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import dbConnect from '@/lib/mongodb';
import User from '@/lib/models/User';
import Progress from '@/lib/models/Progress';
import Flashcard from '@/lib/models/Flashcard';

interface DecodedToken {
  userId: string;
  username: string;
  firstName: string;
  lastName: string;
  iat: number;
  exp: number;
}

/**
 * POST /api/learning/flashcards/progress
 * Update flashcard mastery status in Progress collection
 */
export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const token = request.cookies.get('jwt')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as DecodedToken;

    const { videoId, flashcardId, isMastered } = await request.json();

    if (!videoId || !flashcardId || typeof isMastered !== 'boolean') {
      return NextResponse.json(
        { error: 'Missing required fields: videoId, flashcardId, isMastered' },
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

    // Find or create progress document for this user/video combination
    let progress = await Progress.findOne({
      userId: decoded.userId,
      videoId: videoId
    });

    if (!progress) {
      // Create new progress document
      progress = new Progress({
        userId: decoded.userId,
        videoId: videoId,
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
