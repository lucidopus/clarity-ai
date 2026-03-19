import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import dbConnect from '@/lib/mongodb';
import User from '@/lib/models/User';
import Video from '@/lib/models/Video';
import LearningMaterial from '@/lib/models/LearningMaterial';
import Flashcard from '@/lib/models/Flashcard';
import Quiz from '@/lib/models/Quiz';
import { MindMap } from '@/lib/models';
import Progress from '@/lib/models/Progress';
import { getAdapter } from '@/lib/adapters';

interface DecodedToken {
  userId: string;
  username: string;
  firstName: string;
  lastName: string;
  iat: number;
  exp: number;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ videoId: string }> }
) {
  try {
    // Check authentication
    const token = request.cookies.get('jwt')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as DecodedToken;

    const { videoId } = await params;

    if (!videoId) {
      return NextResponse.json({ error: 'Invalid video ID' }, { status: 400 });
    }

    await dbConnect();

    // Verify user exists
    const user = await User.findById(decoded.userId);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Fetch video to determine ownership and visibility
    const video = await Video.findOne({ videoId });
    if (!video) {
      return NextResponse.json({ error: 'Video not found' }, { status: 404 });
    }

    // Authorization: Must be owner OR video is public
    const isOwner = video.userId.toString() === decoded.userId;
    const isPublic = video.visibility === 'public';

    if (!isOwner && !isPublic) {
      return NextResponse.json({ error: 'Unauthorized access to private video' }, { status: 403 });
    }

    const isReadOnly = !isOwner;

    // Fetch author username
    const author = await User.findById(video.userId).select('username').lean();
    const authorUsername = (author as { username?: string } | null)?.username || undefined;

    // Material Owner: Materials belong to the video creator
    const ownerId = video.userId;

    // Fetch all materials (owner's) and viewer progress
    const [learningMaterial, flashcards, quizzes, mindMap, progress] = await Promise.all([
      LearningMaterial.findOne({ sourceId: videoId, userId: ownerId }),
      Flashcard.find({ sourceId: videoId, userId: ownerId }),
      Quiz.find({ sourceId: videoId, userId: ownerId }),
      MindMap.findOne({ sourceId: videoId, userId: ownerId }),
      Progress.findOne({ sourceId: videoId, userId: decoded.userId }),
    ]);

    // Shape response via adapter
    const adapter = getAdapter('youtube');
    const materials = adapter({
      video,
      flashcards,
      quizzes,
      learningMaterial,
      mindMap,
      progress,
      isReadOnly,
      authorUsername,
    });

    return NextResponse.json(materials);

  } catch (error) {
    console.error('Error fetching video materials:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
