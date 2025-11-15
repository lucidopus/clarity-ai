import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import dbConnect from '@/lib/mongodb';
import Note from '@/lib/models/Note';

interface DecodedToken {
  userId: string;
}

// GET handler to fetch all notes for a video
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ videoId: string }> }
) {
  try {
    const token = request.cookies.get('jwt')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { userId } = jwt.verify(token, process.env.JWT_SECRET!) as DecodedToken;
    const { videoId } = await params;

    await dbConnect();

    const note = await Note.findOne({ userId, videoId });

    return NextResponse.json(note || { generalNote: '', segmentNotes: [] });
  } catch (error) {
    console.error('Error fetching notes:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT handler to update notes for a video
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ videoId: string }> }
) {
  try {
    const token = request.cookies.get('jwt')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { userId } = jwt.verify(token, process.env.JWT_SECRET!) as DecodedToken;
    const { videoId } = await params;
    const body = await request.json();

    await dbConnect();

    const updatedNote = await Note.findOneAndUpdate(
      { userId, videoId },
      { $set: body },
      { upsert: true, new: true }
    );

    return NextResponse.json(updatedNote);
  } catch (error) {
    console.error('Error updating notes:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}