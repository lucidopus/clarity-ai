import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import dbConnect from '@/lib/mongodb';
import Flashcard from '@/lib/models/Flashcard';
import { initFSRSCard } from '@/lib/services/fsrs';

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

    // Lazy migration: initialize FSRS state for any cards that don't have it yet
    const uninitCount = await Flashcard.countDocuments({
      userId: decoded.userId,
      fsrs: { $exists: false },
    });

    if (uninitCount > 0) {
      const uninitCards = await Flashcard.find({
        userId: decoded.userId,
        fsrs: { $exists: false },
      }).select('_id createdAt');

      const bulkOps = uninitCards.map((card) => ({
        updateOne: {
          filter: { _id: card._id },
          update: { $set: { fsrs: initFSRSCard(card.createdAt) } },
        },
      }));
      await Flashcard.bulkWrite(bulkOps);
    }

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
      .lean();

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
