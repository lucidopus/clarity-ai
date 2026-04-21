import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { getCached, CacheKeys } from '@/lib/cache';
import { generateClaraGreeting } from '@/lib/services/claraGreeting';

export async function GET(request: NextRequest) {
  try {
    const decoded = getAuthUser(request);

    const greeting = await getCached(
      CacheKeys.claraGreeting(decoded.userId),
      () => generateClaraGreeting(decoded.userId),
      21600 // 6-hour TTL
    );

    return NextResponse.json(greeting, {
      headers: { 'Cache-Control': 'private, no-store' },
    });
  } catch (error) {
    console.error('Failed to generate Clara greeting:', error);
    return NextResponse.json(
      { text: 'Ready when you are.', tone: 'neutral' },
      { status: 200 } // Graceful fallback, not a 500
    );
  }
}
