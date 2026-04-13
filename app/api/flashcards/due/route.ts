import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import Flashcard from '@/lib/models/Flashcard';
import { ensureFSRSInitialized } from '@/lib/services/fsrs-migrate';

export async function GET(request: NextRequest) {
  try {
    const decoded = getAuthUser(request);
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
