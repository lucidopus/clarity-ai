import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import Source from '@/lib/models/Source';
import { apiErrorResponse } from '@/lib/errors/apiResponse';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sourceId: string }> }
) {
  try {
    const decoded = getAuthUser(request);
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
    return apiErrorResponse('MATERIAL_UNAVAILABLE', 500);
  }
}
