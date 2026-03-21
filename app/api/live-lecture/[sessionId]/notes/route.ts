import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import dbConnect from '@/lib/mongodb';
import LiveSession from '@/lib/models/LiveSession';
import Source from '@/lib/models/Source';

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
// GET /api/live-lecture/[sessionId]/notes — Get lecture notes, markers & transcript
// ═══════════════════════════════════════════════════════════════════════════════

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const decoded = authenticate(request);
    await dbConnect();

    const { sessionId } = await params;

    // Try finding by sessionId first, then by sourceId (for post-lecture access via videoId)
    let session = await LiveSession.findOne({
      sessionId,
      userId: decoded.userId,
    });

    if (!session) {
      session = await LiveSession.findOne({
        sourceId: sessionId,
        userId: decoded.userId,
      });
    }

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // Build transcript text from segments
    const segments = session.transcriptSegments || [];
    const transcriptText = segments
      .map((s: { text: string }) => s.text)
      .join(' ');

    // Format markers with their timestamps
    const markers = (session.importanceMarkers || []).map(
      (m: { offsetSeconds: number; notePosition?: number; createdAt: Date }) => ({
        offsetSeconds: m.offsetSeconds,
        notePosition: m.notePosition,
        createdAt: m.createdAt,
      })
    );

    // Resolve context doc names
    let contextDocs: { sourceId: string; name: string }[] = [];
    if (session.contextDocIds && session.contextDocIds.length > 0) {
      const sources = await Source.find(
        { sourceId: { $in: session.contextDocIds } },
        { sourceId: 1, title: 1 }
      );
      contextDocs = sources.map((s: { sourceId: string; title?: string }) => ({
        sourceId: s.sourceId,
        name: s.title || 'Document',
      }));
    }

    return NextResponse.json({
      sessionId: session.sessionId,
      title: session.title,
      focusNotes: session.focusNotes || '',
      markers,
      transcriptText,
      segments: segments.map(
        (s: { text: string; startOffset: number; endOffset: number }) => ({
          text: s.text,
          startOffset: s.startOffset,
          endOffset: s.endOffset,
        })
      ),
      contextDocs,
      questionCount: session.questionCount || 0,
      durationSeconds: session.durationSeconds,
      startedAt: session.startedAt,
      endedAt: session.endedAt,
    });
  } catch (error: unknown) {
    const err = error as Error & { statusCode?: number };
    if (err.statusCode === 401) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('[LIVE-LECTURE] Notes error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
