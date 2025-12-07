import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import dbConnect from '@/lib/mongodb';
import User from '@/lib/models/User';
import Progress, { IQuizAttempt } from '@/lib/models/Progress';
import Quiz from '@/lib/models/Quiz';

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
  userAnswerIndex: number;
  isCorrect?: boolean; // Optional for backward compatibility/frontend convenience
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

    // Fetch all quizzes involved in the submission for validation
    const quizIds = results.map(r => r.quizId);
    const quizzes = await Quiz.find({ _id: { $in: quizIds } });
    const quizMap = new Map(quizzes.map(q => [q._id.toString(), q]));

    let correctCount = 0;

    // Process each quiz result
    for (const result of results) {
      const quizObjectId = new mongoose.Types.ObjectId(result.quizId);
      const quiz = quizMap.get(result.quizId);
      
      let isCorrect = false;
      // If backend validation is possible (quiz found), use it. 
      // Otherwise fallback to client provided isCorrect (legacy support)
      if (quiz) {
        isCorrect = quiz.correctAnswerIndex === result.userAnswerIndex;
      } else if (typeof result.isCorrect === 'boolean') {
        isCorrect = result.isCorrect;
      }

      if (isCorrect) correctCount++;

      // Check for existing attempt
      const existingAttemptIndex = progress.quizAttempts.findIndex(
        (attempt: IQuizAttempt) => attempt.quizId.toString() === result.quizId
      );

      if (existingAttemptIndex > -1) {
        // Update existing attempt
        progress.quizAttempts[existingAttemptIndex].score = isCorrect ? 100 : 0;
        progress.quizAttempts[existingAttemptIndex].userAnswerIndex = result.userAnswerIndex;
        progress.quizAttempts[existingAttemptIndex].completedAt = new Date();
        progress.quizAttempts[existingAttemptIndex].attemptNumber += 1;
      } else {
        // Add new quiz attempt
        progress.quizAttempts.push({
          quizId: quizObjectId,
          score: isCorrect ? 100 : 0,
          attemptNumber: 1,
          userAnswerIndex: result.userAnswerIndex,
          completedAt: new Date()
        });
      }

      // Update masteredQuizIds if correct
      if (isCorrect) {
        const alreadyMastered = progress.masteredQuizIds.some(
          (id: mongoose.Types.ObjectId) => id.toString() === result.quizId
        );
        if (!alreadyMastered) {
          progress.masteredQuizIds.push(quizObjectId);
        }
      }
    }

    await progress.save();

    // Calculate overall statistics for response
    const totalQuestions = results.length;
    const percentage = Math.round((correctCount / totalQuestions) * 100);

    return NextResponse.json({
      success: true,
      message: 'Quiz results saved successfully',
      stats: {
        totalQuestions,
        correctAnswers: correctCount,
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