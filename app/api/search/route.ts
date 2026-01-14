import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Video from '@/lib/models/Video';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');

    if (!query || query.trim().length === 0) {
      return NextResponse.json({ success: true, results: [] });
    }

    await dbConnect();

    // Perform a fast "Literal" search (Regex)
    // Matches if the query appears in the Title, Channel Name, or Tags
    // Case-insensitive ('i')
    const regex = new RegExp(query, 'i');

    const videos = await Video.find({
      visibility: 'public', // Enforce public only
      $or: [
        { title: { $regex: regex } },
        { channelName: { $regex: regex } },
        { tags: { $in: [regex] } }
      ]
    })
    .select('_id videoId title thumbnail channelName duration category tags')
    .sort({ createdAt: -1 }) // Newest first, or sort by Relevance if we had a score
    .limit(10)
    .lean();

    return NextResponse.json({
      success: true,
      results: videos
    });

  } catch (error) {
    console.error('Search API Error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
