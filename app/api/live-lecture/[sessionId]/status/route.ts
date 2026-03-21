import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import dbConnect from '@/lib/mongodb';
import LiveSession from '@/lib/models/LiveSession';

interface DecodedToken {
  userId: string;
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
// GET /api/live-lecture/[sessionId]/status — Lightweight polling for post-lecture
// ═══════════════════════════════════════════════════════════════════════════════

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const decoded = authenticate(request);
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
  } catch (error: unknown) {
    const err = error as Error & { statusCode?: number };
    if (err.statusCode === 401) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('❌ [LIVE-LECTURE] Status error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
