import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { getAuthUser } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import LiveSession from '@/lib/models/LiveSession';
import Video from '@/lib/models/Video';
import Source from '@/lib/models/Source';
import SourceContent from '@/lib/models/SourceContent';
import ActivityLog from '@/lib/models/ActivityLog';
import { clearSessionHeartbeat } from '@/lib/live-lecture/redis';
import { processVideoPipelineTask } from '@/trigger/process-video-pipeline';
import { internalServerError } from '@/lib/errors/apiResponse';

// ═══════════════════════════════════════════════════════════════════════════════
// POST /api/live-lecture/end — End lecture, create Source, trigger pipeline
// ═══════════════════════════════════════════════════════════════════════════════

export async function POST(request: NextRequest) {
  try {
    const decoded = getAuthUser(request);
    await dbConnect();

    const body = await request.json();
    const { sessionId, finalSegments, focusNotes, finalMarkers } = body;

    if (!sessionId) {
      return NextResponse.json({ error: 'sessionId is required' }, { status: 400 });
    }

    // Verify session
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

    // Final sync — push any remaining segments/markers
    const updateOps: Record<string, unknown> = {};
    const pushOps: Record<string, unknown> = {};

    if (Array.isArray(finalSegments) && finalSegments.length > 0) {
      pushOps.transcriptSegments = { $each: finalSegments };
    }

    if (Array.isArray(finalMarkers) && finalMarkers.length > 0) {
      pushOps.importanceMarkers = { $each: finalMarkers };
    }

    if (typeof focusNotes === 'string') {
      updateOps.focusNotes = focusNotes;
    }

    const endedAt = new Date();
    const durationSeconds = Math.round((endedAt.getTime() - session.startedAt.getTime()) / 1000);

    updateOps.status = 'ended';
    updateOps.endedAt = endedAt;
    updateOps.durationSeconds = durationSeconds;
    updateOps.lastSyncedAt = endedAt;
    updateOps.processingStatus = 'pending';

    const update: Record<string, unknown> = { $set: updateOps };
    if (Object.keys(pushOps).length > 0) {
      update.$push = pushOps;
    }

    await LiveSession.updateOne({ _id: session._id }, update);

    // Re-fetch to get the complete transcript after final push
    const updatedSession = await LiveSession.findById(session._id);
    if (!updatedSession) {
      return NextResponse.json({ error: 'Session not found after update' }, { status: 500 });
    }

    // Build full transcript text — filter out empty segments (noise gate artifacts)
    const segments = (updatedSession.transcriptSegments || []).filter(
      (s: { text: string }) => s.text && s.text.trim()
    );
    const fullText = segments.map((s: { text: string }) => s.text).join(' ');
    const wordCount = fullText.split(/\s+/).filter(Boolean).length;

    if (wordCount < 10) {
      // Too little content — mark as ended but skip pipeline
      await LiveSession.updateOne(
        { _id: session._id },
        { $set: { processingStatus: 'failed' }, $push: { sessionErrors: {
          type: 'post_processing_failed',
          message: 'Transcript too short to generate materials',
          timestamp: new Date(),
          recoverable: false,
          resolved: false,
        }}}
      );
      await clearSessionHeartbeat(sessionId);

      return NextResponse.json({
        success: true,
        sessionId,
        durationSeconds,
        skipped: true,
        reason: 'Transcript too short',
      });
    }

    // Create Source record
    const sourceId = crypto.randomUUID();
    await Source.create({
      userId: decoded.userId,
      sourceId,
      sourceType: 'live_lecture',
      title: updatedSession.title,
      duration: durationSeconds,
      language: 'en',
      processingStatus: 'processing',
      materialsStatus: 'generating',
    });

    // Create SourceContent
    await SourceContent.create({
      sourceId,
      userId: decoded.userId,
      fullText,
      wordCount,
      segments: segments.map((s: { text: string; startOffset: number; endOffset: number }) => ({
        text: s.text,
        startTime: s.startOffset,
        endTime: s.endOffset,
      })),
    });

    // Update LiveSession with sourceId
    await LiveSession.updateOne(
      { _id: session._id },
      { $set: { sourceId, processingStatus: 'processing' } }
    );

    // Create Video doc (legacy compatibility)
    const videoDoc = await Video.create({
      userId: decoded.userId,
      videoId: sourceId,
      title: updatedSession.title,
      channelName: 'Live Lecture',
      visibility: 'private',
      processingStatus: 'processing',
      transcript: [],
      language: 'en',
      duration: durationSeconds,
    });

    // Trigger pipeline
    const handle = await processVideoPipelineTask.trigger({
      userId: decoded.userId,
      username: decoded.username || 'User',
      videoDocId: videoDoc._id.toString(),
      sourceId,
      sourceType: 'live_lecture',
      allSources: [{
        sourceType: 'live_lecture',
        sourceId,
        rawText: fullText,
        title: updatedSession.title,
      }],
    });

    // Log activity
    await ActivityLog.create({
      userId: decoded.userId,
      activityType: 'live_lecture_ended',
      sourceId: sessionId,
      date: new Date(),
      timestamp: new Date(),
      metadata: {
        title: updatedSession.title,
        durationSeconds,
        wordCount,
        segmentCount: segments.length,
        questionCount: updatedSession.questionCount,
        markerCount: updatedSession.importanceMarkers?.length || 0,
        pipelineSourceId: sourceId,
      },
    });

    // Clear Redis heartbeat
    await clearSessionHeartbeat(sessionId);

    console.log(`🎙️ [LIVE-LECTURE] Session ended: ${sessionId}, sourceId: ${sourceId}, duration: ${durationSeconds}s, words: ${wordCount}`);

    return NextResponse.json({
      success: true,
      sessionId,
      sourceId,
      durationSeconds,
      wordCount,
      runId: handle.id,
    });
  } catch (error) {
    console.error('❌ [LIVE-LECTURE] End error:', error);
    return internalServerError();
  }
}
