import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import LiveSession from '@/lib/models/LiveSession';
import { checkSessionAlive } from '@/lib/live-lecture/redis';
import { internalServerError } from '@/lib/errors/apiResponse';

// GET /api/live-lecture/active
// Returns the user's currently-active live session, if any, for
// cross-browser/device crash recovery. The heartbeat is surfaced so the
// client can distinguish a likely-abandoned session from a live one.
export async function GET(request: NextRequest) {
  try {
    const decoded = getAuthUser(request);
    await dbConnect();

    const active = await LiveSession.findOne({
      userId: decoded.userId,
      status: 'active',
    })
      .sort({ startedAt: -1 })
      .select('sessionId title audioSource startedAt contextDocIds')
      .lean() as {
        sessionId: string;
        title: string;
        audioSource: 'mic' | 'system';
        startedAt: Date;
        contextDocIds?: string[];
      } | null;

    if (!active) {
      return NextResponse.json({ session: null });
    }

    let heartbeatAlive = true;
    try {
      heartbeatAlive = await checkSessionAlive(active.sessionId);
    } catch {
      // Treat as alive if Redis is unreachable — the recovery UI can still appear.
    }

    return NextResponse.json({
      session: {
        sessionId: active.sessionId,
        title: active.title,
        audioSource: active.audioSource,
        startedAt: active.startedAt,
        contextDocIds: active.contextDocIds ?? [],
        heartbeatAlive,
      },
    });
  } catch (error) {
    console.error('❌ [LIVE-LECTURE] active error:', error);
    return internalServerError();
  }
}
