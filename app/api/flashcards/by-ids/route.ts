import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import Flashcard from '@/lib/models/Flashcard';

export async function GET(request: NextRequest) {
  try {
    const decoded = getAuthUser(request);
    const ids = request.nextUrl.searchParams.get('ids');

    if (!ids) {
      return NextResponse.json({ error: 'Missing ids parameter' }, { status: 400 });
    }

    await dbConnect();

    const idList = ids.split(',').filter(Boolean);
    const flashcards = await Flashcard.find({
      _id: { $in: idList },
      userId: decoded.userId,
    }).select('question answer sourceId fsrs').lean();

    return NextResponse.json({ flashcards });
  } catch (error) {
    console.error('Error fetching flashcards by IDs:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
