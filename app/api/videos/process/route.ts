import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import dbConnect from '@/lib/mongodb';
import Video from '@/lib/models/Video';
import { extractVideoId, isValidYouTubeUrl } from '@/lib/transcript';
import { ApiError, InvalidURLError, DuplicateVideoError } from '@/lib/errors/ApiError';
import { processVideoPipelineTask } from '@/trigger/process-video-pipeline';

interface DecodedToken {
  userId: string;
  username: string;
  firstName: string;
  lastName: string;
  iat: number;
  exp: number;
}

// ─── Helper: Authenticate request ───────────────────────────────────────────

function authenticate(request: NextRequest): DecodedToken {
  const token = request.cookies.get('jwt')?.value;
  if (!token) {
    throw Object.assign(new Error('Unauthorized'), { statusCode: 401 });
  }
  return jwt.verify(token, process.env.JWT_SECRET!) as DecodedToken;
}

// ═══════════════════════════════════════════════════════════════════════════════
// POST /api/videos/process — Trigger video processing pipeline
// ═══════════════════════════════════════════════════════════════════════════════

export async function POST(request: NextRequest) {
  console.log('🚀 [VIDEO PROCESS] Received processing request...');

  try {
    // 1. Authenticate
    const decoded = authenticate(request);
    console.log(`✅ [VIDEO PROCESS] Authenticated: ${decoded.userId}`);

    // 2. Parse & validate request
    const { youtubeUrl, clientTimestamp, timezoneOffsetMinutes, timeZone } = await request.json();
    if (!youtubeUrl || typeof youtubeUrl !== 'string') {
      return NextResponse.json({ error: 'YouTube URL is required' }, { status: 400 });
    }

    if (!isValidYouTubeUrl(youtubeUrl)) {
      const err = new InvalidURLError();
      return NextResponse.json({ error: err.message, errorType: err.code }, { status: err.statusCode });
    }

    await dbConnect();
    const videoId = extractVideoId(youtubeUrl);

    // 3. Check for duplicates
    const existingVideo = await Video.findOne({ userId: decoded.userId, videoId });
    if (existingVideo) {
      const err = new DuplicateVideoError();
      return NextResponse.json(
        { error: err.message, errorType: err.code, videoId: existingVideo.videoId },
        { status: err.statusCode }
      );
    }

    // 4. Create initial video record
    const videoDoc = await Video.create({
      userId: decoded.userId,
      youtubeUrl,
      videoId,
      title: 'Processing...',
      processingStatus: 'processing',
      transcript: [],
      language: 'en',
    });
    const videoDocId = videoDoc._id.toString();

    // 5. Trigger background pipeline task
    const handle = await processVideoPipelineTask.trigger({
      userId: decoded.userId,
      username: decoded.username || 'User',
      videoDocId,
      videoId,
      youtubeUrl,
      clientTimestamp,
      timezoneOffsetMinutes,
      timeZone,
    });

    console.log(`🚀 [VIDEO PROCESS] Pipeline triggered: run=${handle.id}, videoId=${videoId}`);

    // 6. Return immediately
    return NextResponse.json({
      success: true,
      videoId,
      videoDocId,
      runId: handle.id,
      status: 'processing',
    }, { status: 202 });

  } catch (error) {
    console.error('💥 [VIDEO PROCESS] FATAL ERROR:', error);

    let errorCode = 'UNKNOWN_ERROR';
    let statusCode = 500;
    let errorMessage = 'Internal server error';

    if (error instanceof ApiError) {
      errorCode = error.code;
      statusCode = error.statusCode;
      errorMessage = error.message;
    } else if (error instanceof Error) {
      if ('statusCode' in error && (error as { statusCode: number }).statusCode === 401) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      errorMessage = error.message;
    }

    return NextResponse.json(
      { error: errorMessage, errorType: errorCode },
      { status: statusCode }
    );
  }
}
