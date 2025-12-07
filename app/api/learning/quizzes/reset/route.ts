import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import dbConnect from '@/lib/mongodb';
import User from '@/lib/models/User';
import Progress from '@/lib/models/Progress';

interface DecodedToken {
  userId: string;
  username: string;
  firstName: string;
  lastName: string;
  iat: number;
  exp: number;
}

interface ResetQuizRequest {
  videoId: string; // YouTube video ID
}

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const token = request.cookies.get('jwt')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as DecodedToken;

    const { videoId }: ResetQuizRequest = await request.json();

    if (!videoId) {
      return NextResponse.json(
        { error: 'Missing required field: videoId' },
        { status: 400 }
      );
    }

    await dbConnect();

    // Verify user exists
    const user = await User.findById(decoded.userId);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Find Progress document for this user and video
    const progress = await Progress.findOne({
      userId: decoded.userId,
      videoId: videoId
    });

    if (!progress) {
      // No progress to reset
      return NextResponse.json({
        success: true,
        message: 'No quiz progress found to reset'
      });
    }

    // Clear quiz-related progress
    progress.masteredQuizIds = [];
    progress.quizAttempts = [];
    progress.lastAccessedAt = new Date();

    await progress.save();

    return NextResponse.json({
      success: true,
      message: 'Quiz progress reset successfully'
    });

  } catch (error) {
    console.error('Error resetting quiz progress:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
