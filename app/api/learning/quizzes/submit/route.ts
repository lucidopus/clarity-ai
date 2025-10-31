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

    const { videoId, quizId, answers, score } = await request.json();

    if (!videoId || !quizId || !Array.isArray(answers) || typeof score !== 'number') {
      return NextResponse.json(
        { error: 'Missing or invalid required fields: videoId, quizId, answers (array), score (number)' },
        { status: 400 }
      );
    }

    await dbConnect();

    // Verify user exists
    const user = await User.findById(decoded.userId);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Create quiz attempt record
    const quizAttempt = {
      quizId,
      answers,
      score,
      totalQuestions: answers.length,
      percentage: Math.round((score / answers.length) * 100),
      submittedAt: new Date()
    };

    // Update user's quiz progress
    await User.findByIdAndUpdate(
      decoded.userId,
      {
        $set: {
          [`progress.${videoId}.quizzes.${quizId}`]: {
            score,
            totalQuestions: answers.length,
            percentage: Math.round((score / answers.length) * 100),
            submittedAt: new Date()
          }
        },
        $push: {
          [`progress.${videoId}.quizAttempts`]: quizAttempt
        }
      }
    );

    return NextResponse.json({
      success: true,
      message: 'Quiz submitted successfully',
      attempt: {
        quizId,
        score,
        totalQuestions: answers.length,
        percentage: Math.round((score / answers.length) * 100),
        submittedAt: quizAttempt.submittedAt
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