import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { z } from 'zod';
import dbConnect from '@/lib/mongodb';
import Note from '@/lib/models/Note';
import { apiErrorResponse } from '@/lib/errors/apiResponse';

const noteUpdateSchema = z.object({
  generalNote: z.string().optional(),
  segmentNotes: z.array(z.object({
    segmentId: z.string(),
    content: z.string(),
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

    const updatedNote = await Note.findOneAndUpdate(
      { userId, sourceId },
      { $set: parsed },
      { upsert: true, new: true }
    );

    return NextResponse.json(updatedNote);
  } catch (error) {
    console.error('Error updating notes:', error);
    return apiErrorResponse('MATERIAL_UNAVAILABLE', 500);
  }
}