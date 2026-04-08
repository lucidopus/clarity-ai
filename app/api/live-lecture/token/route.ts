import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import jwt from 'jsonwebtoken';
import dbConnect from '@/lib/mongodb';
import LiveSession from '@/lib/models/LiveSession';
import ActivityLog from '@/lib/models/ActivityLog';

interface DecodedToken {
  userId: string;
  username: string;
  firstName: string;
  lastName: string;
  iat: number;
  exp: number;
}

function authenticate(request: NextRequest): DecodedToken {
  const token = request.cookies.get('jwt')?.value;
  if (!token) {
    throw Object.assign(new Error('Unauthorized'), { statusCode: 401 });
  }
  return jwt.verify(token, process.env.JWT_SECRET!) as DecodedToken;
}

// ═══════════════════════════════════════════════════════════════════════════════
// POST /api/live-lecture/token — Generate ElevenLabs Scribe token + create LiveSession
// ═══════════════════════════════════════════════════════════════════════════════

export async function POST(request: NextRequest) {
  try {
    const decoded = authenticate(request);
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

    // Clean up stale active sessions
    await LiveSession.updateMany(
      {
        userId: decoded.userId,
        status: 'active',
        $or: [
          {
            transcriptSegments: { $size: 0 },
            startedAt: { $lt: new Date(Date.now() - 5 * 60 * 1000) },
          },
          {
            startedAt: { $lt: new Date(Date.now() - 12 * 60 * 60 * 1000) },
          },
        ],
      },
      { $set: { status: 'interrupted', endedAt: new Date() } }
    );

    const existingActive = await LiveSession.findOne({
      userId: decoded.userId,
      status: 'active',
    });

    if (existingActive) {
      return NextResponse.json(
        { error: 'You already have an active session. End it before starting a new one.' },
        { status: 409 }
      );
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
  } catch (error: unknown) {
    const err = error as Error & { statusCode?: number };
    if (err.statusCode === 401) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('❌ [LIVE-LECTURE] Token route error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
