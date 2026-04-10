import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import dbConnect from '@/lib/mongodb';
import Progress from '@/lib/models/Progress';
import Quiz from '@/lib/models/Quiz';

interface DecodedToken {
  userId: string;
  username: string;
  firstName: string;
  lastName: string;
  iat: number;
  exp: number;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sourceId: string }> }
) {
  try {
    const token = request.cookies.get('jwt')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as DecodedToken;
    const { sourceId } = await params;

    await dbConnect();

    const progress = await Progress.findOne({
      userId: decoded.userId,
      sourceId,
    });

    if (!progress || !progress.calibrationHistory?.length) {
      return NextResponse.json({ currentScore: null, history: [], misinformedTopics: [] });
    }

    const history = [...progress.calibrationHistory].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    const currentScore = history[0]?.brierScore ?? null;

    // Collect unique misinformed quiz IDs from the last entry
    const latestMisinformedIds = history[0]?.misinformedQuizIds ?? [];
    const misinformedTopics = latestMisinformedIds.length > 0
      ? await Quiz.find({ _id: { $in: latestMisinformedIds } }, { questionText: 1 }).lean()
      : [];

    return NextResponse.json({
      currentScore,
      history: history.map(entry => ({
        date: entry.date,
        brierScore: entry.brierScore,
        totalQuestions: entry.totalQuestions,
        misinformedCount: entry.misinformedCount,
      })),
      misinformedTopics: misinformedTopics.map((q: { _id: unknown; questionText: string }) => ({
        quizId: q._id,
        questionText: q.questionText,
      })),
    });
  } catch (error) {
    console.error('Error fetching calibration data:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
