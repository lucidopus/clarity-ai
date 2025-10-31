import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import dbConnect from '@/lib/mongodb';
import Note from '@/lib/models/Note';

interface DecodedToken {
  userId: string;
  username: string;
  firstName: string;
  lastName: string;
  iat: number;
  exp: number;
}

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const token = request.cookies.get('jwt')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as DecodedToken;

    // Get videoId from query params
    const { searchParams } = new URL(request.url);
    const videoId = searchParams.get('videoId');

    if (!videoId) {
      return NextResponse.json({ error: 'videoId is required' }, { status: 400 });
    }

    await dbConnect();

    // Fetch note for this user and video
    const note = await Note.findOne({
      userId: decoded.userId,
      videoId: videoId
    });

    return NextResponse.json({
      content: note?.content || '',
      updatedAt: note?.updatedAt || null
    });

  } catch (error) {
    console.error('Error fetching note:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const token = request.cookies.get('jwt')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as DecodedToken;

    const { videoId, content } = await request.json();

    if (!videoId) {
      return NextResponse.json({ error: 'videoId is required' }, { status: 400 });
    }

    await dbConnect();

    // Upsert note (update if exists, create if not)
    const note = await Note.findOneAndUpdate(
      {
        userId: decoded.userId,
        videoId: videoId
      },
      {
        userId: decoded.userId,
        videoId: videoId,
        content: content || ''
      },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true
      }
    );

    return NextResponse.json({
      success: true,
      content: note.content,
      updatedAt: note.updatedAt
    });

  } catch (error) {
    console.error('Error saving note:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
