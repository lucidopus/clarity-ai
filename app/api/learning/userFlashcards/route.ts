import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import dbConnect from '@/lib/mongodb';
import User from '@/lib/models/User';

interface DecodedToken {
  userId: string;
  username: string;
  firstName: string;
  lastName: string;
  iat: number;
  exp: number;
}

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

    // Create new user flashcard
    const flashcardId = `user_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    const flashcard = {
      id: flashcardId,
      question: question.trim(),
      answer: answer.trim(),
      isUserCreated: true,
      isMastered: false,
      createdAt: new Date()
    };

    // Add to user's flashcards
    await User.findByIdAndUpdate(
      decoded.userId,
      {
        $push: {
          [`userFlashcards.${videoId}`]: flashcard
        }
      }
    );

    return NextResponse.json({
      success: true,
      message: 'Flashcard created successfully',
      flashcard
    });

  } catch (error) {
    console.error('Error creating user flashcard:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

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
    const videoId = searchParams.get('videoId');

    if (!flashcardId || !videoId) {
      return NextResponse.json(
        { error: 'Missing flashcard ID or video ID' },
        { status: 400 }
      );
    }

    await dbConnect();

    // Remove flashcard from user's document
    const updateResult = await User.findByIdAndUpdate(
      decoded.userId,
      {
        $pull: {
          [`userFlashcards.${videoId}`]: { id: flashcardId }
        }
      },
      { new: true }
    );

    if (!updateResult) {
      return NextResponse.json(
        { error: 'Flashcard not found or not owned by user' },
        { status: 404 }
      );
    }

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