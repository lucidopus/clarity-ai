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

    const { videoId, flashcardId, isMastered } = await request.json();

    if (!videoId || !flashcardId || typeof isMastered !== 'boolean') {
      return NextResponse.json(
        { error: 'Missing required fields: videoId, flashcardId, isMastered' },
        { status: 400 }
      );
    }

    await dbConnect();

    // Verify user exists
    const user = await User.findById(decoded.userId);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Update progress in user's document
    // For now, we'll store progress in the user document
    // In a real app, you might want a separate Progress collection
    const progressUpdate = {
      [`progress.${videoId}.flashcards.${flashcardId}`]: {
        isMastered,
        updatedAt: new Date()
      }
    };

    await User.findByIdAndUpdate(decoded.userId, progressUpdate);

    return NextResponse.json({
      success: true,
      message: `Flashcard ${isMastered ? 'marked as mastered' : 'reset'}`,
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