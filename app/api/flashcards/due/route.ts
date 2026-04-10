import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import dbConnect from '@/lib/mongodb';
import Flashcard from '@/lib/models/Flashcard';
import { ensureFSRSInitialized } from '@/lib/services/fsrs-migrate';

interface DecodedToken {
  userId: string;
  username: string;
  firstName: string;
  lastName: string;
}

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('jwt')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as DecodedToken;
    await dbConnect();
    await ensureFSRSInitialized(decoded.userId);

    const now = new Date();
    const dueCards = await Flashcard.find({
      userId: decoded.userId,
      'fsrs.due': { $lte: now },
    })
      .sort({ 'fsrs.due': 1 })
      .lean();

    // Find the next card not yet due
    const nextCard = await Flashcard.findOne({
      userId: decoded.userId,
      'fsrs.due': { $gt: now },
    })
      .sort({ 'fsrs.due': 1 })
      .select('fsrs.due')
      .lean() as { fsrs?: { due?: Date } } | null;

    return NextResponse.json({
      dueCards,
      totalDue: dueCards.length,
      nextReviewDate: nextCard?.fsrs?.due ?? null,
    });
  } catch (error) {
    console.error('Error fetching due flashcards:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
