import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
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

interface QuizResult {
  quizId: string; // MongoDB ObjectId as string
  isCorrect: boolean;
}

interface SubmitQuizRequest {
  videoId: string; // YouTube video ID
  results: QuizResult[];
}

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const token = request.cookies.get('jwt')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as DecodedToken;

    const { videoId, results }: SubmitQuizRequest = await request.json();

    if (!videoId || !Array.isArray(results) || results.length === 0) {
      return NextResponse.json(
        { error: 'Missing or invalid required fields: videoId, results (array)' },
        { status: 400 }
      );
    }

    await dbConnect();

    // Verify user exists
    const user = await User.findById(decoded.userId);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Find or create Progress document for this user and video
    let progress = await Progress.findOne({
      userId: decoded.userId,
      videoId: videoId
    });

    if (!progress) {
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

    // Update lastAccessedAt
    progress.lastAccessedAt = new Date();

    // Process each quiz result
    for (const result of results) {
      const quizObjectId = new mongoose.Types.ObjectId(result.quizId);

      // Calculate attempt number for this quiz
      const previousAttempts = progress.quizAttempts.filter(
        (attempt: any) => attempt.quizId.toString() === result.quizId
      );
      const attemptNumber = previousAttempts.length + 1;

      // Add quiz attempt (score: 100 for correct, 0 for incorrect)
      progress.quizAttempts.push({
        quizId: quizObjectId,
        score: result.isCorrect ? 100 : 0,
        attemptNumber: attemptNumber,
        completedAt: new Date()
      } as any);

      // Update masteredQuizIds if correct
      if (result.isCorrect) {
        const alreadyMastered = progress.masteredQuizIds.some(
          (id: any) => id.toString() === result.quizId
        );
        if (!alreadyMastered) {
          progress.masteredQuizIds.push(quizObjectId as any);
        }
      }
    }

    await progress.save();

    // Calculate overall statistics for response
    const totalQuestions = results.length;
    const correctAnswers = results.filter(r => r.isCorrect).length;
    const percentage = Math.round((correctAnswers / totalQuestions) * 100);

    return NextResponse.json({
      success: true,
      message: 'Quiz results saved successfully',
      stats: {
        totalQuestions,
        correctAnswers,
        percentage,
        masteredCount: progress.masteredQuizIds.length
      }
    });

  } catch (error) {
    console.error('Error submitting quiz:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}