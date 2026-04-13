import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { getOrCompileTodaysMix } from '@/lib/services/todaysMix';

export async function GET(request: NextRequest) {
  try {
    const decoded = getAuthUser(request);
    const mix = await getOrCompileTodaysMix(decoded.userId);
    return NextResponse.json(mix);
  } catch (error) {
    console.error('Failed to get today\'s mix:', error);
    return NextResponse.json({ error: 'Failed to load today\'s mix' }, { status: 500 });
  }
}
