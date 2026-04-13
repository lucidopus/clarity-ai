import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import SourceContent from '@/lib/models/SourceContent';
import Video from '@/lib/models/Video';

// GET /api/videos/[videoId]/segments — Return transcript segments for a source
// Supports both primary videoId and secondary sourceIds (multi-source)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ videoId: string }> }
) {
  try {
    const decoded = getAuthUser(request);
    const { videoId } = await params;

    await dbConnect();

    // Try direct match first, then check if it's a secondary source in allSourceIds
    let video = await Video.findOne({ videoId });
    if (!video) {
      video = await Video.findOne({ allSourceIds: videoId });
    }
    if (!video) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const isOwner = video.userId.toString() === decoded.userId;
    const isPublic = video.visibility === 'public';
    if (!isOwner && !isPublic) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const sourceContent = await SourceContent.findOne({
      sourceId: videoId,
      userId: video.userId,
    });

    if (!sourceContent) {
      return NextResponse.json({ segments: [] });
    }

    return NextResponse.json({
      segments: sourceContent.segments || [],
      fullText: sourceContent.fullText,
      wordCount: sourceContent.wordCount,
    });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
