import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Video from '@/lib/models/Video';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '12');
    const skip = (page - 1) * limit;

    await dbConnect();

    // Fetch public videos, sorted by newest first
    const videos = await Video.find({
      visibility: 'public',
      processingStatus: 'completed'
    })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('userId', 'firstName lastName avatarUrl email'); // Populate creator info

    // Get total count for pagination
    const total = await Video.countDocuments({
      visibility: 'public',
      processingStatus: 'completed'
    });

    return NextResponse.json({
      processedData: videos.map(video => ({
        _id: video._id.toString(),
        id: video.videoId,
        title: video.title,
        channelName: video.channelName || 'YouTube',
        thumbnailUrl: video.thumbnail || `https://img.youtube.com/vi/${video.videoId}/hqdefault.jpg`,
        duration: video.duration || 0,
        createdAt: video.createdAt,
        user: video.userId ? {
          name: video.userId.firstName ? `${video.userId.firstName} ${video.userId.lastName || ''}`.trim() : 'Anonymous',
          // Use email as fallback for avatar if needed, or implement avatar logic
          avatarUrl: video.userId.avatarUrl || null
        } : { name: 'Anonymous' }
      })),
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Error fetching discover videos:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
