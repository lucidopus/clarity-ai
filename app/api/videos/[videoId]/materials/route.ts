import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import dbConnect from '@/lib/mongodb';
import User from '@/lib/models/User';
import Video from '@/lib/models/Video';
import Source from '@/lib/models/Source';
import type { SourceType } from '@/lib/models/Source';
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

    // Fetch all materials (owner's), viewer progress, and source metadata
    const [learningMaterial, flashcards, quizzes, mindMap, progress, source] = await Promise.all([
      LearningMaterial.findOne({ sourceId: videoId, userId: ownerId }),
      Flashcard.find({ sourceId: videoId, userId: ownerId }),
      Quiz.find({ sourceId: videoId, userId: ownerId }),
      MindMap.findOne({ sourceId: videoId, userId: ownerId }),
      Progress.findOne({ sourceId: videoId, userId: decoded.userId }),
      Source.findOne({ sourceId: videoId, userId: ownerId }),
    ]);

    // Determine source type from Source doc, with fallbacks
    let sourceType: SourceType = 'youtube';
    if (source) {
      sourceType = source.sourceType;
    } else if (video.channelName === 'Live Lecture') {
      sourceType = 'live_lecture';
    }

    // Shape response via adapter
    const adapter = getAdapter(sourceType);
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

    // Set the correct sourceType
    materials.sourceType = sourceType as typeof materials.sourceType;

    // Include source metadata for the viewer (fileUrl, fileName, etc.)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mat = materials as any;
    if (source) {
      mat.sourceMeta = {
        fileUrl: source.fileUrl,
        fileName: source.fileName,
        fileSize: source.fileSize,
        mimeType: source.mimeType,
        sourceUrl: source.sourceUrl,
      };
    }

    // Multi-source: include all sources metadata when generation has >1 source
    const allSourceIds = video.allSourceIds as string[] | undefined;
    if (allSourceIds && allSourceIds.length > 1) {
      const allSources = await Source.find({
        sourceId: { $in: allSourceIds },
        userId: ownerId,
      }).lean();

      mat.sources = allSources.map((s: Record<string, unknown>) => ({
        sourceId: s.sourceId,
        sourceType: s.sourceType,
        title: s.title,
        fileName: s.fileName,
        fileUrl: s.fileUrl,
        sourceUrl: s.sourceUrl,
        duration: s.duration,
        mimeType: s.mimeType,
      }));
    }

    return NextResponse.json(materials);

  } catch (error) {
    console.error('Error fetching video materials:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
