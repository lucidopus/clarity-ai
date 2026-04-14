import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import User from '@/lib/models/User';
import Progress from '@/lib/models/Progress';
import { apiErrorResponse } from '@/lib/errors/apiResponse';

interface ResetQuizRequest {
  videoId?: string;
  sourceId?: string;
}

export async function POST(request: NextRequest) {
  try {
    const decoded = getAuthUser(request);

    const body: ResetQuizRequest = await request.json();
    const sourceId = body.sourceId || body.videoId;

    if (!sourceId) {
      return NextResponse.json(
        { error: 'Missing required field: sourceId (or videoId)' },
        { status: 400 }
      );
    }

    await dbConnect();

    // Verify user exists
    const user = await User.findById(decoded.userId);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Find Progress document for this user and source
    const progress = await Progress.findOne({
      userId: decoded.userId,
      sourceId: sourceId
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
    return apiErrorResponse('MATERIAL_UNAVAILABLE', 500);
  }
}
