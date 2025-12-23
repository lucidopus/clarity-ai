import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import dbConnect from '@/lib/mongodb';
import Video from '@/lib/models/Video';
import mongoose from 'mongoose';

interface DecodedToken {
  userId: string;
  iat: number;
  exp: number;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ videoId: string }> }
) {
  try {
    const { videoId } = await params;
    
    // Check authentication
    const token = request.cookies.get('jwt')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as DecodedToken;
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
