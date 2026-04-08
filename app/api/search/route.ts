import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import dbConnect from '@/lib/mongodb';
import Source from '@/lib/models/Source';
import { generateEmbeddings } from '@/lib/embedding';
import { RECOMMENDATION_CONSTANTS } from '@/lib/config';
import { escapeRegex } from '@/lib/utils/escape-regex';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Require authentication
    const token = request.cookies.get('jwt')?.value;
    if (!token) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }
    try {
      jwt.verify(token, process.env.JWT_SECRET!);
    } catch {
      return NextResponse.json({ success: false, message: 'Invalid token' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');
    const mode = searchParams.get('mode') || 'basic'; // 'basic' | 'semantic'

    if (!query || query.trim().length === 0) {
      return NextResponse.json({ success: true, results: [] });
    }

    await dbConnect();

    let videos = [];

    if (mode === 'semantic') {
      // 1. Semantic Search (Vector) on Source collection
      // Best for understanding intent (e.g., "how to build a website" -> matches "Intro to HTML")

      const vector = await generateEmbeddings(query) as number[];

      const results = await Source.aggregate([
        {
          $vectorSearch: {
            index: RECOMMENDATION_CONSTANTS.VECTOR_INDEX_NAME, // "source_vector_index"
            path: "embedding",
            queryVector: vector,
            numCandidates: 100,
            limit: 20
          }
        },
        {
          $match: { visibility: 'public' }
        },
        {
          $project: {
            _id: 1,
            sourceId: 1,
            title: 1,
            thumbnail: 1,
            channelName: 1,
            duration: 1,
            category: 1,
            tags: 1,
            summary: 1,
            score: { $meta: "vectorSearchScore" }
          }
        }
      ]);

      // Alias sourceId → videoId for frontend compatibility
      videos = results.map(r => ({ ...r, videoId: r.sourceId }));

    } else {
      // 2. Basic Search (Regex) on Source collection - Default
      // Best for Autocomplete / Exact Keyword matching

      const regex = new RegExp(escapeRegex(query), 'i');
      const results = await Source.find({
        visibility: 'public',
        $or: [
          { title: { $regex: regex } },
          { channelName: { $regex: regex } },
          { tags: { $in: [regex] } }
        ]
      })
      .select('_id sourceId title thumbnail channelName duration category tags')
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

      // Alias sourceId → videoId for frontend compatibility
      videos = results.map(r => ({ ...r, videoId: (r as unknown as { sourceId: string }).sourceId }));
    }

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
