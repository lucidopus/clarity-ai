import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import dbConnect from '@/lib/mongodb';
import User from '@/lib/models/User';
import Progress, { IQuizAttempt } from '@/lib/models/Progress';
import Quiz from '@/lib/models/Quiz';
import { computeBrierScore } from '@/lib/services/calibration';
import { recordStudyActivity } from '@/lib/services/streaks';

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
  confidenceRating?: number; // 1 = Guessing, 2 = Somewhat Sure, 3 = Confident
}

interface SubmitQuizRequest {
  videoId?: string;
  sourceId?: string;
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

    const body: SubmitQuizRequest = await request.json();
    const sourceId = body.sourceId || body.videoId;
    const { results } = body;

    if (!sourceId || !Array.isArray(results) || results.length === 0) {
      return NextResponse.json(
        { error: 'Missing or invalid required fields: sourceId (or videoId), results (array)' },
        { status: 400 }
      );
    }

    await dbConnect();

    // Verify user exists
    const user = await User.findById(decoded.userId);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Find or create Progress document for this user and source
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

    // Update lastAccessedAt
    progress.lastAccessedAt = new Date();

    // Fetch all quizzes involved in the submission for validation
    const quizIds = results.map(r => r.quizId);
    const quizzes = await Quiz.find({ _id: { $in: quizIds } });
    const quizMap = new Map(quizzes.map(q => [q._id.toString(), q]));

    // Verify all quizzes belong to the claimed sourceId
    for (const quiz of quizzes) {
      if (quiz.sourceId && quiz.sourceId.toString() !== sourceId) {
        return NextResponse.json(
          { error: 'Quiz does not belong to the specified source' },
          { status: 403 }
        );
      }
    }

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
        if (result.confidenceRating) {
          progress.quizAttempts[existingAttemptIndex].confidenceRating = result.confidenceRating;
        }
      } else {
        // Add new quiz attempt
        progress.quizAttempts.push({
          quizId: quizObjectId,
          score: isCorrect ? 100 : 0,
          attemptNumber: 1,
          userAnswerIndex: result.userAnswerIndex,
          confidenceRating: result.confidenceRating,
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

    // Compute and store calibration entry if confidence ratings were provided
    const ratedResults = results
      .map((r, i) => ({
        confidenceRating: r.confidenceRating,
        isCorrect: quizMap.get(r.quizId)
          ? quizMap.get(r.quizId)!.correctAnswerIndex === r.userAnswerIndex
          : (r.isCorrect ?? false),
        quizId: results[i].quizId,
      }))
      .filter((r): r is { confidenceRating: number; isCorrect: boolean; quizId: string } =>
        r.confidenceRating !== undefined && r.confidenceRating !== null
      );

    let brierScore: number | null = null;
    if (ratedResults.length > 0) {
      brierScore = computeBrierScore(
        ratedResults.map(({ confidenceRating, isCorrect }) => ({ confidenceRating, isCorrect }))
      );

      const misinformedQuizIds = ratedResults
        .filter(r => !r.isCorrect && r.confidenceRating === 3)
        .map(r => new mongoose.Types.ObjectId(r.quizId));

      if (!progress.calibrationHistory) progress.calibrationHistory = [];
      progress.calibrationHistory.push({
        date: new Date(),
        brierScore,
        totalQuestions: ratedResults.length,
        misinformedCount: misinformedQuizIds.length,
        misinformedQuizIds,
      });
    }

    await progress.save();

    // Record streak activity (fire-and-forget)
    recordStudyActivity(decoded.userId, 'quiz_completed').catch(() => {});

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
        masteredCount: progress.masteredQuizIds.length,
        brierScore,
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