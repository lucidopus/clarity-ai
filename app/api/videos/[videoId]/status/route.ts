import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import Video from '@/lib/models/Video';
import { internalServerError } from '@/lib/errors/apiResponse';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ videoId: string }> }
) {
  try {
    const decoded = getAuthUser(request);

    await dbConnect();
    const { videoId } = await params;

    const video = await Video.findOne(
      { videoId },
      'userId visibility processingStatus materialsStatus errorType errorMessage title thumbnail allSourceIds channelName'
    );

    if (!video) {
      return NextResponse.json({ error: 'Video not found' }, { status: 404 });
    }

    const isOwner = video.userId.toString() === decoded.userId;
    const isPublic = video.visibility === 'public';

    if (!isOwner && !isPublic) {
      return NextResponse.json({ error: 'Unauthorized access to private video' }, { status: 403 });
    }

    return NextResponse.json({
      processingStatus: video.processingStatus,
      materialsStatus: video.materialsStatus,
      errorType: video.errorType,
      errorMessage: video.errorMessage,
      title: video.title,
      thumbnail: video.thumbnail,
    });
  } catch {
    return internalServerError();
  }
}
