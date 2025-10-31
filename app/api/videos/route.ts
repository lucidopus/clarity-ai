import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import dbConnect from '@/lib/mongodb';
import Video from '@/lib/models/Video';

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

    await dbConnect();

    // Get all completed videos for the user
    const videos = await Video.find({
      userId: decoded.userId
    }).sort({ createdAt: -1 });

    return NextResponse.json({
      videos: videos.map(video => ({
        id: video.videoId, // YouTube video ID for routing to /generations/${videoId}
        _id: video._id.toString(), // MongoDB ID (kept for backward compatibility if needed)
        title: video.title,
        channelName: video.channelName,
        thumbnailUrl: video.thumbnail, // Fixed: use 'thumbnail' field name
        duration: video.duration,
        transcriptMinutes: Math.round((video.transcript?.reduce((total: number, seg: { duration: number }) => total + seg.duration, 0) || 0) / 60),
        createdAt: video.createdAt
      }))
    });

  } catch (error) {
    console.error('Error fetching videos:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}