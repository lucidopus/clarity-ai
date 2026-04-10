import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import dbConnect from '@/lib/mongodb';
import DailyChallenge from '@/lib/models/DailyChallenge';
import { generateDailyChallenges } from '@/lib/services/dailyChallenges';

interface DecodedToken {
  userId: string;
  username: string;
  firstName: string;
  lastName: string;
}

function getUTCDateString(): string {
  return new Date().toISOString().split('T')[0];
}

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('jwt')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as DecodedToken;
    await dbConnect();

    const today = getUTCDateString();

    // Get or create today's challenge document
    let doc = await DailyChallenge.findOne({ userId: decoded.userId, date: today }).lean();
    if (!doc) {
      const created = await DailyChallenge.findOneAndUpdate(
        { userId: decoded.userId, date: today },
        { $setOnInsert: { challenges: generateDailyChallenges(today), allCompleted: false } },
        { upsert: true, new: true }
      ).lean();
      doc = created;
    }

    return NextResponse.json({
      date: today,
      challenges: doc?.challenges ?? [],
      allCompleted: doc?.allCompleted ?? false,
    });
  } catch (error) {
    console.error('Error fetching daily challenges:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
