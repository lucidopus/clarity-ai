import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import dbConnect from '@/lib/mongodb';
import Source from '@/lib/models/Source';

interface DecodedToken { userId: string }

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sourceId: string }> }
) {
  try {
    const token = request.cookies.get('jwt')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as DecodedToken;
    const { sourceId } = await params;

    await dbConnect();

    const source = await Source.findOne({ sourceId, userId: decoded.userId }).select('audioPodcast').lean();

    if (!source || !(source as Record<string, unknown>).audioPodcast) {
      return NextResponse.json({ available: false });
    }

    const podcast = (source as Record<string, unknown>).audioPodcast as Record<string, unknown>;
    return NextResponse.json({
      available: true,
      url: podcast.url,
      duration: podcast.duration,
      generatedAt: podcast.generatedAt,
    });
  } catch (error) {
    console.error('Error fetching podcast:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
