import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { completeMixItem } from '@/lib/services/todaysMix';

export async function POST(request: NextRequest) {
  try {
    const decoded = getAuthUser(request);
    const { itemIndex } = await request.json();

    if (typeof itemIndex !== 'number' || itemIndex < 0) {
      return NextResponse.json({ error: 'Invalid itemIndex' }, { status: 400 });
    }

    const result = await completeMixItem(decoded.userId, itemIndex);
    if (!result) {
      return NextResponse.json({ error: 'Mix not found or invalid index' }, { status: 404 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Failed to complete mix item:', error);
    return NextResponse.json({ error: 'Failed to update mix' }, { status: 500 });
  }
}
