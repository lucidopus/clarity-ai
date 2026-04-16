import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { z } from 'zod';
import dbConnect from '@/lib/mongodb';
import Note from '@/lib/models/Note';
import { apiErrorResponse } from '@/lib/errors/apiResponse';
import { persistDocumentReadiness, type PageSignal } from '@/lib/documentReadiness';
import { logServerActivity } from '@/lib/serverActivityLogger';
import { recordStudyActivity } from '@/lib/services/streaks';

const noteUpdateSchema = z.object({
  generalNote: z.string().optional(),
  segmentNotes: z.array(z.object({
    segmentId: z.string(),
    content: z.string().optional().default(''),
    confidence: z.enum(['red', 'yellow', 'green']).optional(),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional(),
  })).optional(),
});

// GET handler to fetch all notes for a video
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ videoId: string }> }
) {
  try {
    const { userId } = getAuthUser(request);
    const { videoId: sourceId } = await params;

    await dbConnect();

    const note = await Note.findOne({ userId, sourceId });

    return NextResponse.json(note || { generalNote: '', segmentNotes: [] });
  } catch (error) {
    console.error('Error fetching notes:', error);
    return apiErrorResponse('MATERIAL_UNAVAILABLE', 500);
  }
}

// PUT handler to update notes for a video
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ videoId: string }> }
) {
  try {
    const { userId } = getAuthUser(request);
    const { videoId: sourceId } = await params;
    const body = await request.json();
    const parsed = noteUpdateSchema.parse(body);

    await dbConnect();

    // Read the prior doc before the update so we can diff confidence
    // transitions (Red/Yellow → Green) for the page_cleared hero event.
    const priorNote = parsed.segmentNotes
      ? await Note.findOne({ userId, sourceId })
          .select({ segmentNotes: 1 })
          .lean<{ segmentNotes?: PageSignal[] } | null>()
      : null;

    const updatedNote = await Note.findOneAndUpdate(
      { userId, sourceId },
      { $set: parsed },
      { upsert: true, new: true }
    );

    // Roll up document signals into Progress + activity streams. Failures
    // here must never bubble — the user's note save has already succeeded.
    if (parsed.segmentNotes) {
      try {
        const result = await persistDocumentReadiness(
          userId,
          sourceId,
          parsed.segmentNotes,
          priorNote?.segmentNotes,
        );

        for (const cleared of result.pageCleared) {
          await logServerActivity(userId, 'page_cleared', {
            sourceId,
            page: cleared.page,
            from: cleared.from,
            // Present when the segmentId was qualified (post-migration data).
            // Absent for legacy `page-N` clears where the sub-source is unknown.
            ...(cleared.subSourceId ? { subSourceId: cleared.subSourceId } : {}),
          });
        }

        if (result.sessionCrossed) {
          await logServerActivity(userId, 'document_study_session', { sourceId });
          recordStudyActivity(userId, 'document_study_session').catch((err) => {
            console.error('recordStudyActivity(document_study_session) failed', err);
          });
        }
      } catch (err) {
        console.error('persistDocumentReadiness / activity log failed', err);
      }
    }

    return NextResponse.json(updatedNote);
  } catch (error) {
    console.error('Error updating notes:', error);
    return apiErrorResponse('MATERIAL_UNAVAILABLE', 500);
  }
}
