import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import dbConnect from '@/lib/mongodb';
import Generation from '@/lib/models/Generation';

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

    // Get all generations for the user
    const generations = await Generation.find({
      userId: decoded.userId
    }).sort({ createdAt: -1 });

    return NextResponse.json({
      generations: generations.map(gen => ({
        id: gen._id.toString(),
        youtubeUrl: gen.youtubeUrl,
        status: gen.status,
        progress: gen.progress,
        title: gen.title,
        channelName: gen.channelName,
        thumbnailUrl: gen.thumbnailUrl,
        duration: gen.duration,
        errorMessage: gen.errorMessage,
        createdAt: gen.createdAt,
        updatedAt: gen.updatedAt,
        startedAt: gen.startedAt,
        completedAt: gen.completedAt
      }))
    });

  } catch (error) {
    console.error('Error fetching generations:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}