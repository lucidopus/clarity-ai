import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import dbConnect from '@/lib/mongodb';
import User from '@/lib/models/User';
import Video from '@/lib/models/Video';
import LearningMaterial from '@/lib/models/LearningMaterial';
import Flashcard from '@/lib/models/Flashcard';
import Quiz from '@/lib/models/Quiz';
// Deprecated: mock pipeline removed. This endpoint is deprecated in favor of /api/videos/process

interface DecodedToken {
  userId: string;
  username: string;
  firstName: string;
  lastName: string;
  iat: number;
  exp: number;
}

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const token = request.cookies.get('jwt')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as DecodedToken;

    const { youtubeUrl } = await request.json();

    if (!youtubeUrl || typeof youtubeUrl !== 'string') {
      return NextResponse.json(
        { error: 'YouTube URL is required' },
        { status: 400 }
      );
    }

    // Basic YouTube URL validation
    const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/)[a-zA-Z0-9_-]{11}/;
    if (!youtubeRegex.test(youtubeUrl.trim())) {
      return NextResponse.json(
        { error: 'Invalid YouTube URL format' },
        { status: 400 }
      );
    }

    // This endpoint is deprecated now that the mock pipeline is removed.
    // Clients should call /api/videos/process instead (Phase 5 pipeline).
    return NextResponse.json(
      {
        error: 'Deprecated endpoint. Use /api/videos/process instead.',
        status: 410,
      },
      { status: 410 }
    );
  } catch (error) {
    console.error('Error processing video with mock pipeline:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}