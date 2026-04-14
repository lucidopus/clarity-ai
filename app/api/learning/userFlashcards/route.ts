import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import User from '@/lib/models/User';
import Flashcard from '@/lib/models/Flashcard';
import { recordStudyActivity } from '@/lib/services/streaks';
import { apiErrorResponse } from '@/lib/errors/apiResponse';

/**
 * POST /api/learning/userFlashcards
 * Create a new user-generated flashcard
 */
export async function POST(request: NextRequest) {
  try {
    const decoded = getAuthUser(request);

    const body = await request.json();
    const sourceId = body.sourceId || body.videoId;
    const { question, answer } = body;

    if (!sourceId || !question?.trim() || !answer?.trim()) {
      return NextResponse.json(
        { error: 'Missing required fields: sourceId (or videoId), question, answer' },
        { status: 400 }
      );
    }

    await dbConnect();

    // Verify user exists
    const user = await User.findById(decoded.userId);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const { initFSRSCard } = await import('@/lib/services/fsrs');

    // Create new user flashcard in Flashcard collection
    const newFlashcard = new Flashcard({
      userId: decoded.userId,
      sourceId: sourceId,
      question: question.trim(),
      answer: answer.trim(),
      difficulty: null, // User-created cards have no difficulty rating
      generationType: 'human',
      fsrs: initFSRSCard(),
    });

    await newFlashcard.save();

    recordStudyActivity(decoded.userId, 'flashcard_created').catch((err) => {
      console.error('Failed to record streak activity for flashcard creation:', err);
    });

    return NextResponse.json({
      success: true,
      message: 'Flashcard created successfully',
      flashcard: {
        id: newFlashcard._id.toString(),
        question: newFlashcard.question,
        answer: newFlashcard.answer,
        isUserCreated: true,
        isMastered: false,
        createdAt: newFlashcard.createdAt
      }
    });

  } catch (error) {
    console.error('Error creating user flashcard:', error);
    return apiErrorResponse('MATERIAL_UNAVAILABLE', 500);
  }
}

/**
 * PUT /api/learning/userFlashcards
 * Update an existing user-generated flashcard
 */
export async function PUT(request: NextRequest) {
  try {
    const decoded = getAuthUser(request);

    const { flashcardId, question, answer } = await request.json();

    if (!flashcardId || !question?.trim() || !answer?.trim()) {
      return NextResponse.json(
        { error: 'Missing required fields: flashcardId, question, answer' },
        { status: 400 }
      );
    }

    await dbConnect();

    // Find flashcard and verify ownership
    const flashcard = await Flashcard.findById(flashcardId);

    if (!flashcard) {
      return NextResponse.json(
        { error: 'Flashcard not found' },
        { status: 404 }
      );
    }

    // Verify user owns this flashcard
    if (flashcard.userId.toString() !== decoded.userId) {
      return NextResponse.json(
        { error: 'You do not have permission to edit this flashcard' },
        { status: 403 }
      );
    }

    // Verify it's a user-created flashcard
    if (flashcard.generationType !== 'human') {
      return NextResponse.json(
        { error: 'Cannot edit AI-generated flashcards' },
        { status: 403 }
      );
    }

    // Update flashcard
    flashcard.question = question.trim();
    flashcard.answer = answer.trim();
    await flashcard.save();

    return NextResponse.json({
      success: true,
      message: 'Flashcard updated successfully',
      flashcard: {
        id: flashcard._id.toString(),
        question: flashcard.question,
        answer: flashcard.answer,
        isUserCreated: true,
        updatedAt: flashcard.updatedAt
      }
    });

  } catch (error) {
    console.error('Error updating user flashcard:', error);
    return apiErrorResponse('MATERIAL_UNAVAILABLE', 500);
  }
}

/**
 * DELETE /api/learning/userFlashcards?id={flashcardId}
 * Delete a user-generated flashcard
 */
export async function DELETE(request: NextRequest) {
  try {
    const decoded = getAuthUser(request);

    const { searchParams } = new URL(request.url);
    const flashcardId = searchParams.get('id');

    if (!flashcardId) {
      return NextResponse.json(
        { error: 'Missing flashcard ID' },
        { status: 400 }
      );
    }

    await dbConnect();

    // Find flashcard and verify ownership
    const flashcard = await Flashcard.findById(flashcardId);

    if (!flashcard) {
      return NextResponse.json(
        { error: 'Flashcard not found' },
        { status: 404 }
      );
    }

    // Verify user owns this flashcard
    if (flashcard.userId.toString() !== decoded.userId) {
      return NextResponse.json(
        { error: 'You do not have permission to delete this flashcard' },
        { status: 403 }
      );
    }

    // Verify it's a user-created flashcard
    if (flashcard.generationType !== 'human') {
      return NextResponse.json(
        { error: 'Cannot delete AI-generated flashcards' },
        { status: 403 }
      );
    }

    // Delete flashcard
    await Flashcard.findByIdAndDelete(flashcardId);

    return NextResponse.json({
      success: true,
      message: 'Flashcard deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting user flashcard:', error);
    return apiErrorResponse('MATERIAL_UNAVAILABLE', 500);
  }
}
