import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import LiveSession from '@/lib/models/LiveSession';
import { internalServerError } from '@/lib/errors/apiResponse';

// ═══════════════════════════════════════════════════════════════════════════════
// GET /api/live-lecture/[sessionId] — Full LiveSession (crash recovery)
// ═══════════════════════════════════════════════════════════════════════════════

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const decoded = getAuthUser(request);
    await dbConnect();

    const { sessionId } = await params;

    const session = await LiveSession.findOne({
      sessionId,
      userId: decoded.userId,
    });

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    return NextResponse.json({ session });
  } catch (error) {
    console.error('❌ [LIVE-LECTURE] Get session error:', error);
    return internalServerError();
  }
}
