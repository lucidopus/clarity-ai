import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import LiveSession from '@/lib/models/LiveSession';
import { internalServerError } from '@/lib/errors/apiResponse';

// GET /api/live-lecture/by-source/[sourceId] — Resolve sessionId from sourceId
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sourceId: string }> }
) {
  try {
    const decoded = getAuthUser(request);
    await dbConnect();

    const { sourceId } = await params;

    const session = await LiveSession.findOne(
      { sourceId, userId: decoded.userId },
      { sessionId: 1 }
    );

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    return NextResponse.json({ sessionId: session.sessionId });
  } catch (error) {
    console.error('[LIVE-LECTURE] By-source error:', error);
    return internalServerError();
  }
}
