import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Video from '@/lib/models/Video';
import { generateEmbeddings } from '@/lib/embedding';
import { RECOMMENDATION_CONSTANTS } from '@/lib/config';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');
    const mode = searchParams.get('mode') || 'basic'; // 'basic' | 'semantic'

    if (!query || query.trim().length === 0) {
      return NextResponse.json({ success: true, results: [] });
    }

    await dbConnect();

    let videos = [];

    if (mode === 'semantic') {
      // 1. Semantic Search (Vector)
      // Best for understanding intent (e.g., "how to build a website" -> matches "Intro to HTML")
      
      // Generate embedding for the query
      // The generateEmbeddings function returns number[] | number[][]
      // We cast to number[] since we are passing a single string
      const vector = await generateEmbeddings(query) as number[];

      videos = await Video.aggregate([
        {
          $vectorSearch: {
            index: RECOMMENDATION_CONSTANTS.VECTOR_INDEX_NAME, // "vector_index"
            path: "embedding",
            queryVector: vector,
            numCandidates: 100, // Look at 100 nearest neighbors
            limit: 20 // Return top 20 relevant results
          }
        },
        {
          $match: { visibility: 'public' } // Enforce public visibility
        },
        {
          $project: {
            _id: 1,
            videoId: 1,
            title: 1,
            thumbnail: 1,
            channelName: 1,
            duration: 1,
            category: 1,
            tags: 1,
            description: 1,
            summary: 1,
            score: { $meta: "vectorSearchScore" } // Return relevance score
          }
        }
      ]);

    } else {
      // 2. Basic Search (Regex) - Default
      // Best for Autocomplete / Exact Keyword matching
      
      const regex = new RegExp(query, 'i');
      videos = await Video.find({
        visibility: 'public',
        $or: [
          { title: { $regex: regex } },
          { channelName: { $regex: regex } },
          { tags: { $in: [regex] } }
        ]
      })
      .select('_id videoId title thumbnail channelName duration category tags')
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();
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
