import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import LiveSession from '@/lib/models/LiveSession';

// ═══════════════════════════════════════════════════════════════════════════════
// GET /api/live-lecture/[sessionId]/status — Lightweight polling for post-lecture
// ═══════════════════════════════════════════════════════════════════════════════

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const decoded = getAuthUser(request);
    await dbConnect();

    const { sessionId } = await params;

    const session = await LiveSession.findOne(
      { sessionId, userId: decoded.userId },
      { status: 1, processingStatus: 1, sourceId: 1, durationSeconds: 1 }
    );

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    return NextResponse.json({
      status: session.status,
      processingStatus: session.processingStatus,
      sourceId: session.sourceId,
      durationSeconds: session.durationSeconds,
    });
  } catch (error) {
    console.error('❌ [LIVE-LECTURE] Status error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
