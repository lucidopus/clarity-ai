import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { getReadinessScore } from '@/lib/services/readinessScore';

interface DecodedToken {
  userId: string;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sourceId: string }> }
) {
  try {
    const token = request.cookies.get('jwt')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as DecodedToken;
    const { sourceId } = await params;

    const result = await getReadinessScore(decoded.userId, sourceId);
    return NextResponse.json(result, {
      headers: { 'Cache-Control': 'private, max-age=86400' },
    });
  } catch (error) {
    console.error('Error computing clarity score:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
