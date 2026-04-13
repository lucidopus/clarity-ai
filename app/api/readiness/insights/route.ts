import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { getClarityInsights } from '@/lib/services/clarityInsights';

export async function GET(request: NextRequest) {
  try {
    const decoded = getAuthUser(request);
    const result = await getClarityInsights(decoded.userId);
    return NextResponse.json(result, {
      headers: { 'Cache-Control': 'private, max-age=21600' },
    });
  } catch (error) {
    console.error('Error computing clarity insights:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
