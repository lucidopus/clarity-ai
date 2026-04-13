import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import Video from '@/lib/models/Video';
import mongoose from 'mongoose';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ videoId: string }> }
) {
  try {
    const { videoId } = await params;

    const decoded = getAuthUser(request);
    const userId = new mongoose.Types.ObjectId(decoded.userId);

    const body = await request.json();
    const { visibility } = body;

    if (!['public', 'private'].includes(visibility)) {
      return NextResponse.json({ error: 'Invalid visibility status' }, { status: 400 });
    }

    await dbConnect();

    // Find the video and verify ownership
    const video = await Video.findOne({
      videoId: videoId,
      userId: userId
    });

    if (!video) {
      return NextResponse.json({ error: 'Video not found or unauthorized' }, { status: 404 });
    }

    // Update visibility
    video.visibility = visibility;
    await video.save();

    return NextResponse.json({
      success: true,
      visibility: video.visibility
    });

  } catch (error) {
    console.error('Error updating video visibility:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
