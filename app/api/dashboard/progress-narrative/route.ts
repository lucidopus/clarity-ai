import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { getCached, CacheKeys } from '@/lib/cache';
import { generateProgressNarrative } from '@/lib/services/progressNarrative';

export async function GET(request: NextRequest) {
  try {
    const decoded = getAuthUser(request);

    const narrative = await getCached(
      CacheKeys.progressNarrative(decoded.userId),
      () => generateProgressNarrative(decoded.userId),
      1800 // 30-minute TTL
    );

    return NextResponse.json(narrative, {
      headers: { 'Cache-Control': 'private, max-age=300' },
    });
  } catch (error) {
    console.error('Failed to generate progress narrative:', error);
    return NextResponse.json(
      { narrative: 'Every session builds on the last. Keep going.', category: 'growth' },
      { status: 200 }
    );
  }
}
