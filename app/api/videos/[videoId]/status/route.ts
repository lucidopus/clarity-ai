import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import dbConnect from '@/lib/mongodb';
import Video from '@/lib/models/Video';

interface DecodedToken {
  userId: string;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ videoId: string }> }
) {
  try {
    const token = request.cookies.get('jwt')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as DecodedToken;

    await dbConnect();
    const { videoId } = await params;

    const video = await Video.findOne(
      { userId: decoded.userId, videoId },
      'processingStatus materialsStatus errorType errorMessage title thumbnail'
    );

    if (!video) {
      return NextResponse.json({ error: 'Video not found' }, { status: 404 });
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
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
