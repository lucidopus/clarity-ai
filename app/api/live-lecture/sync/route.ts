import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import LiveSession from '@/lib/models/LiveSession';
import { setSessionHeartbeat } from '@/lib/live-lecture/redis';
import { parseJsonBody, isErrorResponse } from '@/lib/utils/api';

// ═══════════════════════════════════════════════════════════════════════════════
// POST /api/live-lecture/sync — Batch sync segments, notes, markers (every 10s)
// ═══════════════════════════════════════════════════════════════════════════════

export async function POST(request: NextRequest) {
  try {
    const decoded = getAuthUser(request);
    await dbConnect();

    const bodyOrError = await parseJsonBody<{
      sessionId?: string;
      newSegments?: { text?: string }[];
      focusNotes?: string;
      newMarkers?: unknown[];
      markInterrupted?: boolean;
    }>(request, 512_000); // 512KB max for sync payloads
    if (isErrorResponse(bodyOrError)) return bodyOrError;
    const { sessionId, newSegments, focusNotes, newMarkers, markInterrupted } = bodyOrError;

    if (!sessionId) {
      return NextResponse.json({ error: 'sessionId is required' }, { status: 400 });
    }

    // Handle connection failure cleanup — mark session as interrupted
    if (markInterrupted) {
      await LiveSession.updateOne(
        { sessionId, userId: decoded.userId, status: 'active' },
        { $set: { status: 'interrupted', endedAt: new Date() } }
      );
      return NextResponse.json({ success: true });
    }

    // Verify session belongs to user and is active
    const session = await LiveSession.findOne({
      sessionId,
      userId: decoded.userId,
      status: 'active',
    });

    if (!session) {
      return NextResponse.json(
        { error: 'Active session not found' },
        { status: 404 }
      );
    }

    // Build update operations
    const updateOps: Record<string, unknown> = {};
    const pushOps: Record<string, unknown> = {};

    if (Array.isArray(newSegments) && newSegments.length > 0) {
      // Filter out empty segments (noise gate artifacts)
      const validSegments = newSegments.filter((s: { text?: string }) => s.text && s.text.trim());
      if (validSegments.length > 0) {
        // Cap at 5000 segments (~14 hours at 10s intervals) to prevent 16MB BSON limit
        pushOps.transcriptSegments = { $each: validSegments, $slice: -5000 };
      }
    }

    if (Array.isArray(newMarkers) && newMarkers.length > 0) {
      // Cap importance markers at 500
      pushOps.importanceMarkers = { $each: newMarkers, $slice: -500 };
    }

    if (typeof focusNotes === 'string') {
      updateOps.focusNotes = focusNotes;
    }

    updateOps.lastSyncedAt = new Date();

    const update: Record<string, unknown> = { $set: updateOps };
    if (Object.keys(pushOps).length > 0) {
      update.$push = pushOps;
    }

    await LiveSession.updateOne({ _id: session._id }, update);

    // Refresh heartbeat
    await setSessionHeartbeat(sessionId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('❌ [LIVE-LECTURE] Sync error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
