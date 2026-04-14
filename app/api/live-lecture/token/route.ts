import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { getAuthUser } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import LiveSession from '@/lib/models/LiveSession';
import ActivityLog from '@/lib/models/ActivityLog';
import { checkSessionAlive, clearSessionHeartbeat } from '@/lib/live-lecture/redis';
import { internalServerError } from '@/lib/errors/apiResponse';

const FOUR_HOURS_MS = 4 * 60 * 60 * 1000;

// ═══════════════════════════════════════════════════════════════════════════════
// POST /api/live-lecture/token — Generate ElevenLabs Scribe token + create LiveSession
// ═══════════════════════════════════════════════════════════════════════════════

export async function POST(request: NextRequest) {
  try {
    const decoded = getAuthUser(request);
    await dbConnect();

    const body = await request.json();
    const { title, audioSource, contextDocIds = [], resumeSessionId } = body;

    // Generate ElevenLabs single-use token (shared by both new + resume flows)
    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'ElevenLabs API key not configured' },
        { status: 500 }
      );
    }

    const tokenResponse = await fetch(
      'https://api.elevenlabs.io/v1/single-use-token/realtime_scribe',
      {
        method: 'POST',
        headers: { 'xi-api-key': apiKey },
        signal: AbortSignal.timeout(10000),
      }
    );

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('❌ [LIVE-LECTURE] ElevenLabs token error:', errorText);
      return NextResponse.json(
        { error: 'Failed to generate transcription token' },
        { status: 502 }
      );
    }

    const tokenData = await tokenResponse.json();

    // ── Resume existing session ──
    if (resumeSessionId) {
      const existing = await LiveSession.findOne({
        sessionId: resumeSessionId,
        userId: decoded.userId,
        status: 'active',
      });

      if (!existing) {
        return NextResponse.json(
          { error: 'Session not found or already ended' },
          { status: 404 }
        );
      }

      console.log(`🔄 [LIVE-LECTURE] Session resumed: ${resumeSessionId} by user ${decoded.userId}`);

      return NextResponse.json({
        token: tokenData.token,
        sessionId: existing.sessionId,
        title: existing.title,
        audioSource: existing.audioSource,
        startedAt: existing.startedAt,
        contextDocIds: existing.contextDocIds,
        resumed: true,
      });
    }

    // ── New session ──
    if (!title || !audioSource) {
      return NextResponse.json(
        { error: 'title and audioSource are required' },
        { status: 400 }
      );
    }

    if (!['mic', 'system'].includes(audioSource)) {
      return NextResponse.json(
        { error: 'audioSource must be "mic" or "system"' },
        { status: 400 }
      );
    }

    if (contextDocIds.length > 2) {
      return NextResponse.json(
        { error: 'Maximum 2 context documents allowed' },
        { status: 400 }
      );
    }

    // Staleness check: if user has an active session, verify it's actually
    // alive via the Redis heartbeat (30s TTL, refreshed every 15s by the
    // client bubble). If the heartbeat is gone OR the session is > 4 h old,
    // treat it as abandoned and auto-interrupt. Otherwise surface a 409 with
    // `errorType: 'STALE_SESSION'` so the UI can offer a recovery action.
    const existingActive = await LiveSession.findOne({
      userId: decoded.userId,
      status: 'active',
    });

    if (existingActive) {
      let heartbeatAlive = true;
      try {
        heartbeatAlive = await checkSessionAlive(existingActive.sessionId);
      } catch (err) {
        // If Redis is unreachable, fall back to age-only and assume alive —
        // we'd rather show the recovery UI than silently kill a live session.
        console.warn('⚠️ [LIVE-LECTURE] Redis heartbeat check failed:', err);
      }
      const ageMs = Date.now() - new Date(existingActive.startedAt).getTime();
      const isStale = !heartbeatAlive || ageMs > FOUR_HOURS_MS;

      if (isStale) {
        // Sweep ALL active sessions for this user — not just the one we
        // read — in case rapid retries or races left more than one.
        const staleActives = await LiveSession.find(
          { userId: decoded.userId, status: 'active' },
          { sessionId: 1 },
        ).lean() as unknown as Array<{ sessionId: string }>;

        await LiveSession.updateMany(
          { userId: decoded.userId, status: 'active' },
          { $set: { status: 'interrupted', endedAt: new Date() } },
        );

        await Promise.all(
          staleActives.map((s) => clearSessionHeartbeat(s.sessionId).catch(() => {})),
        );
        // fall through to create a new session
      } else {
        return NextResponse.json(
          {
            error: "You have a previous session that wasn't ended properly.",
            errorType: 'STALE_SESSION',
            staleSessionId: existingActive.sessionId,
          },
          { status: 409 },
        );
      }
    }

    const sessionId = uuidv4();

    const session = await LiveSession.create({
      userId: decoded.userId,
      sessionId,
      title,
      status: 'active',
      audioSource,
      startedAt: new Date(),
      contextDocIds,
    });

    await ActivityLog.create({
      userId: decoded.userId,
      activityType: 'live_lecture_started',
      sourceId: sessionId,
      date: new Date(),
      timestamp: new Date(),
      metadata: { title, audioSource },
    });

    console.log(`🎙️ [LIVE-LECTURE] Session started: ${sessionId} by user ${decoded.userId}`);

    return NextResponse.json({
      token: tokenData.token,
      sessionId: session.sessionId,
      title: session.title,
    });
  } catch (error) {
    console.error('❌ [LIVE-LECTURE] Token route error:', error);
    return internalServerError();
  }
}
