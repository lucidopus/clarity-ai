import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import FlashcardReview from '@/lib/models/FlashcardReview';

const MIN_REVIEWS_FOR_OPTIMIZATION = 100;

export async function POST(request: NextRequest) {
  try {
    const decoded = getAuthUser(request);
    await dbConnect();

    const reviewCount = await FlashcardReview.countDocuments({ userId: decoded.userId });

    if (reviewCount < MIN_REVIEWS_FOR_OPTIMIZATION) {
      return NextResponse.json({
        optimized: false,
        reviewCount,
        message: `You need at least ${MIN_REVIEWS_FOR_OPTIMIZATION} reviews to optimize your schedule. You have ${reviewCount}.`,
      });
    }

    // ts-fsrs optimizer requires the full review history in a specific format.
    // Full implementation deferred until ts-fsrs optimizer API is stable in v5.x.
    // For now, return the current review count and a placeholder message.
    return NextResponse.json({
      optimized: false,
      reviewCount,
      message: 'Parameter optimization will be available after your review history grows further.',
    });
  } catch (error) {
    console.error('Error optimizing FSRS parameters:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
