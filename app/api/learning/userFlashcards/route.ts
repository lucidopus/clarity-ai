import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import dbConnect from '@/lib/mongodb';
import User from '@/lib/models/User';
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
 * POST /api/learning/userFlashcards
 * Create a new user-generated flashcard
 */
export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const token = request.cookies.get('jwt')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as DecodedToken;

    const { videoId, question, answer } = await request.json();

    if (!videoId || !question?.trim() || !answer?.trim()) {
      return NextResponse.json(
        { error: 'Missing required fields: videoId, question, answer' },
        { status: 400 }
      );
    }

    await dbConnect();

    // Verify user exists
    const user = await User.findById(decoded.userId);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Create new user flashcard in Flashcard collection
    const newFlashcard = new Flashcard({
      userId: decoded.userId,
      videoId: videoId,
      question: question.trim(),
      answer: answer.trim(),
      generationType: 'human',
      // No difficulty field for user-created cards
    });

    await newFlashcard.save();

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
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/learning/userFlashcards
 * Update an existing user-generated flashcard
 */
export async function PUT(request: NextRequest) {
  try {
    // Check authentication
    const token = request.cookies.get('jwt')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as DecodedToken;

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
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/learning/userFlashcards?id={flashcardId}
 * Delete a user-generated flashcard
 */
export async function DELETE(request: NextRequest) {
  try {
    // Check authentication
    const token = request.cookies.get('jwt')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as DecodedToken;

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
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
