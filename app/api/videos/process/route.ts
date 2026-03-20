import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import dbConnect from '@/lib/mongodb';
import Video from '@/lib/models/Video';
import { extractVideoId, isValidYouTubeUrl } from '@/lib/transcript';
import { ApiError, InvalidURLError, DuplicateVideoError } from '@/lib/errors/ApiError';
import { processVideoPipelineTask } from '@/trigger/process-video-pipeline';
import type { SourceType } from '@/lib/models/Source';

interface DecodedToken {
  userId: string;
  username: string;
  firstName: string;
  lastName: string;
  iat: number;
  exp: number;
}

interface SourceItem {
  sourceType: SourceType;
  youtubeUrl?: string;
  rawText?: string;
  title?: string;
  // File upload fields (document, audio)
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  mimeType?: string;
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
// POST /api/videos/process — Trigger content processing pipeline
// ═══════════════════════════════════════════════════════════════════════════════

export async function POST(request: NextRequest) {
  console.log('🚀 [PROCESS] Received processing request...');

  try {
    // 1. Authenticate
    const decoded = authenticate(request);
    console.log(`✅ [PROCESS] Authenticated: ${decoded.userId}`);

    // 2. Parse request body
    const body = await request.json();

    // Sanitize client context fields
    const clientTimestamp = typeof body.clientTimestamp === 'string' ? body.clientTimestamp.slice(0, 40) : undefined;
    const timezoneOffsetMinutes = typeof body.timezoneOffsetMinutes === 'number' && Number.isFinite(body.timezoneOffsetMinutes)
      ? Math.max(-840, Math.min(840, body.timezoneOffsetMinutes))
      : undefined;
    const timeZone = typeof body.timeZone === 'string' ? body.timeZone.slice(0, 60) : undefined;

    // Support both new `sources[]` format and legacy single-source format
    let sources: SourceItem[];
    if (Array.isArray(body.sources) && body.sources.length > 0) {
      sources = body.sources;
    } else if (body.sourceType || body.youtubeUrl) {
      // Legacy format: single source
      sources = [{
        sourceType: body.sourceType || 'youtube',
        youtubeUrl: body.youtubeUrl,
        rawText: body.rawText,
        title: body.title,
      }];
    } else {
      return NextResponse.json({ error: 'No sources provided' }, { status: 400 });
    }

    // Enforce per-type source limits
    const textCount = sources.filter(s => s.sourceType === 'text').length;
    if (textCount > 2) {
      return NextResponse.json({ error: 'Maximum 2 text notes allowed per generation', errorType: 'TOO_MANY_SOURCES' }, { status: 400 });
    }
    const docCount = sources.filter(s => s.sourceType === 'document').length;
    if (docCount > 2) {
      return NextResponse.json({ error: 'Maximum 2 documents allowed per generation', errorType: 'TOO_MANY_SOURCES' }, { status: 400 });
    }

    console.log(`📋 [PROCESS] ${sources.length} source(s): ${sources.map(s => s.sourceType).join(', ')}`);

    await dbConnect();

    // 3. Validate each source and build pipeline source items
    let primarySourceId: string | null = null;
    let videoTitle = 'Processing...';
    let youtubeUrl: string | undefined;

    const validatedSources: Array<{
      sourceType: SourceType;
      sourceId: string;
      sourceUrl?: string;
      rawText?: string;
      title?: string;
      fileUrl?: string;
      fileName?: string;
      fileSize?: number;
      mimeType?: string;
    }> = [];

    for (const source of sources) {
      if (source.sourceType === 'youtube') {
        if (!source.youtubeUrl || typeof source.youtubeUrl !== 'string') {
          return NextResponse.json({ error: 'YouTube URL is required' }, { status: 400 });
        }
        if (!isValidYouTubeUrl(source.youtubeUrl)) {
          const err = new InvalidURLError();
          return NextResponse.json({ error: err.message, errorType: err.code }, { status: err.statusCode });
        }
        const videoId = extractVideoId(source.youtubeUrl);

        const existingVideo = await Video.findOne({ userId: decoded.userId, videoId });
        if (existingVideo) {
          const err = new DuplicateVideoError();
          return NextResponse.json(
            { error: err.message, errorType: err.code, videoId: existingVideo.videoId },
            { status: err.statusCode }
          );
        }

        // YouTube is the primary source (used as videoId)
        primarySourceId = videoId;
        youtubeUrl = source.youtubeUrl;
        validatedSources.push({
          sourceType: 'youtube',
          sourceId: videoId,
          sourceUrl: source.youtubeUrl,
        });
      } else if (source.sourceType === 'text') {
        if (!source.rawText || typeof source.rawText !== 'string' || source.rawText.trim().length === 0) {
          return NextResponse.json({ error: 'Text content is required' }, { status: 400 });
        }
        const wordCount = source.rawText.trim().split(/\s+/).length;
        if (wordCount > 1000) {
          return NextResponse.json(
            { error: `Text content exceeds the 1,000-word limit (${wordCount} words). Please shorten your notes.`, errorType: 'TEXT_TOO_LONG' },
            { status: 400 }
          );
        }
        const textId = crypto.randomUUID();
        const textTitle = source.title?.trim() || source.rawText.trim().split('\n')[0].slice(0, 80) || 'Text Notes';

        // If no primary source yet, text becomes primary
        if (!primarySourceId) {
          primarySourceId = textId;
          videoTitle = textTitle;
        }
        validatedSources.push({
          sourceType: 'text',
          sourceId: textId,
          rawText: source.rawText.trim(),
          title: textTitle,
        });
      } else if (source.sourceType === 'document') {
        if (!source.fileUrl || typeof source.fileUrl !== 'string') {
          return NextResponse.json({ error: 'File URL is required for document sources' }, { status: 400 });
        }
        if (!source.fileName || !source.mimeType) {
          return NextResponse.json({ error: 'File name and MIME type are required for document sources' }, { status: 400 });
        }
        const docId = crypto.randomUUID();
        const docTitle = source.fileName.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ') || 'Document';

        if (!primarySourceId) {
          primarySourceId = docId;
          videoTitle = docTitle;
        }
        validatedSources.push({
          sourceType: 'document',
          sourceId: docId,
          sourceUrl: source.fileUrl,
          title: docTitle,
          fileUrl: source.fileUrl,
          fileName: source.fileName,
          fileSize: source.fileSize,
          mimeType: source.mimeType,
        });
      } else if (source.sourceType === 'audio') {
        if (!source.fileUrl || typeof source.fileUrl !== 'string') {
          return NextResponse.json({ error: 'File URL is required for audio sources' }, { status: 400 });
        }
        if (!source.fileName || !source.mimeType) {
          return NextResponse.json({ error: 'File name and MIME type are required for audio sources' }, { status: 400 });
        }
        const audioId = crypto.randomUUID();
        const audioTitle = source.fileName.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ') || 'Audio Recording';

        if (!primarySourceId) {
          primarySourceId = audioId;
          videoTitle = audioTitle;
        }
        validatedSources.push({
          sourceType: 'audio',
          sourceId: audioId,
          sourceUrl: source.fileUrl,
          title: audioTitle,
          fileUrl: source.fileUrl,
          fileName: source.fileName,
          fileSize: source.fileSize,
          mimeType: source.mimeType,
        });
      } else {
        return NextResponse.json({ error: `Source type '${source.sourceType}' is not yet supported` }, { status: 400 });
      }
    }

    if (!primarySourceId) {
      return NextResponse.json({ error: 'No valid sources provided' }, { status: 400 });
    }

    // 4. Create initial video record (primary source = videoId)
    const videoDoc = await Video.create({
      userId: decoded.userId,
      youtubeUrl,
      videoId: primarySourceId,
      title: videoTitle,
      processingStatus: 'processing',
      transcript: [],
      language: 'en',
    });
    const videoDocId = videoDoc._id.toString();

    // 5. Trigger background pipeline task with all sources
    const handle = await processVideoPipelineTask.trigger({
      userId: decoded.userId,
      username: decoded.username || 'User',
      videoDocId,
      sourceId: primarySourceId,
      sourceType: validatedSources[0].sourceType,
      sourceUrl: youtubeUrl,
      rawText: validatedSources.find(s => s.sourceType === 'text')?.rawText,
      // Pass all sources for multi-source concatenation
      allSources: validatedSources,
      clientTimestamp,
      timezoneOffsetMinutes,
      timeZone,
    });

    console.log(`🚀 [PROCESS] Pipeline triggered: run=${handle.id}, primarySourceId=${primarySourceId}, sources=${validatedSources.length}`);

    // 6. Return immediately
    return NextResponse.json({
      success: true,
      videoId: primarySourceId,
      videoDocId,
      runId: handle.id,
      status: 'processing',
    }, { status: 202 });

  } catch (error) {
    console.error('💥 [PROCESS] FATAL ERROR:', error);

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
