import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import DailyChallenge from '@/lib/models/DailyChallenge';
import { IChallenge } from '@/lib/models/DailyChallenge';
import { generateDailyChallenges } from '@/lib/services/dailyChallenges';

interface IDailyChallengeDoc {
  challenges: IChallenge[];
  allCompleted: boolean;
}

function getUTCDateString(): string {
  return new Date().toISOString().split('T')[0];
}

export async function GET(request: NextRequest) {
  try {
    const decoded = getAuthUser(request);
    await dbConnect();

    const today = getUTCDateString();

    // Get or create today's challenge document
    let doc = await DailyChallenge.findOne({ userId: decoded.userId, date: today }).lean() as IDailyChallengeDoc | null;
    if (!doc) {
      doc = await DailyChallenge.findOneAndUpdate(
        { userId: decoded.userId, date: today },
        { $setOnInsert: { challenges: generateDailyChallenges(today), allCompleted: false } },
        { upsert: true, new: true }
      ).lean() as IDailyChallengeDoc | null;
    }

    return NextResponse.json({
      date: today,
      challenges: doc?.challenges ?? [],
      allCompleted: doc?.allCompleted ?? false,
    }, {
      headers: { 'Cache-Control': 'private, max-age=300' },
    });
  } catch (error) {
    console.error('Error fetching daily challenges:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
