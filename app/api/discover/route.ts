import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import dbConnect from '@/lib/mongodb';
import { redis } from '@/lib/redis';
import Progress from '@/lib/models/Progress';
import Source from '@/lib/models/Source';
import User from '@/lib/models/User';
import { CategorySelector } from '@/lib/services/category-selector';
import { CatalogVideo } from '@/lib/catalog';

// Type definitions for the Candidate object stored in Redis
interface RedisCandidate {
  _id: string; // Mongo ID
  videoId: string; // YouTube ID
  score: number;
  category?: string;
  title?: string;
}

interface HydratedVideo {
  videoId: string;
  title: string;
  thumbnail?: string;
  channelName?: string;
  duration?: number;
  category?: string;
  tags?: string[];
  materialsStatus?: string;
  incompleteMaterials?: string[];
  summary?: string;
  userId?: string | { toString(): string };
  score?: number;
  durationSeconds?: number;
  authorUsername?: string;
  _id?: string;
}

export async function GET(request: NextRequest) {
  try {
    // 1. Authentication
    const token = request.cookies.get('jwt')?.value;
    if (!token) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string };
    const userId = decoded.userId;

    // 2. Fetch Candidates from Redis (Logic A Output)
    const redisKey = `discover_pool:${userId}`;
    const cachedData = await redis.get(redisKey);

    if (!cachedData) {
      // Logic: Fallback if cache is empty (New user or cron hasn't run)
      // Ideally, we might trigger an immediate generation here, or return a "Popular" list.
      return NextResponse.json({ 
        success: true, 
        recommended: [], 
        categories: [],
        message: "Recommendations are being generated." 
      });
    }

    const parsedCache = JSON.parse(cachedData);
    const candidates: RedisCandidate[] = parsedCache.candidates || [];

    // 3. Logic B: Deduplication (Filter Sufficiently-Completed Videos)
    await dbConnect();

    // Fetch progress docs with mastery counts so we can apply a smart threshold.
    // Only exclude videos where the user has made meaningful progress (≥50% mastered),
    // not just opened or barely interacted with.
    const userProgress = await Progress.find({ userId: userId })
      .select('sourceId masteredFlashcardIds masteredQuizIds totalStudyTimeSeconds')
      .lean() as unknown as { sourceId: string; masteredFlashcardIds: unknown[]; masteredQuizIds: unknown[]; totalStudyTimeSeconds: number }[];

    // Build a set of truly "completed" videos — those with substantial engagement
    const MASTERY_THRESHOLD = 15; // ~75% of a typical video's materials (flashcards + quizzes)
    const STUDY_TIME_THRESHOLD = 1800; // 30 minutes of study time
    const completedVideoIds = new Set(
      userProgress
        .filter(p => {
          const masteredCount = (p.masteredFlashcardIds?.length || 0) + (p.masteredQuizIds?.length || 0);
          return masteredCount >= MASTERY_THRESHOLD || p.totalStudyTimeSeconds >= STUDY_TIME_THRESHOLD;
        })
        .map(p => p.sourceId)
    );

    // Filter candidates: Keep those NOT substantially completed
    const freshCandidates = candidates.filter(c => !completedVideoIds.has(c.videoId));

    // 4. Logic C: Hydration & Smart Categorization 

    // Fetch User Preferences for Context-Aware Sorting
    const user = await User.findById(userId).select('preferences.learning');

    // Fetch from Source collection (canonical), alias sourceId → videoId for frontend compat
    const freshVideoIds = freshCandidates.map(c => c.videoId);
    const sources = await Source.find({ sourceId: { $in: freshVideoIds } })
        .select('sourceId title thumbnail channelName duration category tags materialsStatus incompleteMaterials summary userId')
        .lean() as unknown as (HydratedVideo & { sourceId: string })[];

    // Map sourceId → videoId so downstream (frontend, category selector) keeps working
    const videos: HydratedVideo[] = sources.map(s => ({
        ...s,
        videoId: s.sourceId,
    }));

    // B) Fetch author usernames
    const uniqueUserIds = [...new Set(videos.map((v) => v.userId?.toString()).filter(Boolean))];
    const users = await User.find({ _id: { $in: uniqueUserIds } }).select('_id username').lean() as unknown as { _id: string; username: string }[];
    const usernameMap = new Map(users.map((u) => [u._id.toString(), u.username]));

    const scoreMap = new Map(freshCandidates.map(c => [c.videoId, c.score]));
    
    const richCandidates = videos.map((v) => ({
        ...v,
        score: scoreMap.get(v.videoId) || 0,
        durationSeconds: v.duration || 0,
        authorUsername: v.userId ? usernameMap.get(v.userId.toString()) : undefined
    }));

    // 4. Logic D: Dynamic Category Selection
    
    // Get user timezone from query param
    const { searchParams } = new URL(request.url);
    const tz = searchParams.get('tz') || 'UTC';
    
    // Get current time in user's timezone
    let referenceDate = new Date();
    try {
        const formatter = new Intl.DateTimeFormat('en-US', {
            timeZone: tz,
            year: 'numeric',
            month: 'numeric',
            day: 'numeric',
            hour: 'numeric',
            minute: 'numeric',
            second: 'numeric',
            hour12: false
        });
        const parts = formatter.formatToParts(new Date());
        const getPart = (type: string) => parts.find(p => p.type === type)?.value || '0';
        
        // This date object "looks" like the local time (its methods will return local values)
        referenceDate = new Date(
            parseInt(getPart('year')),
            parseInt(getPart('month')) - 1,
            parseInt(getPart('day')),
            parseInt(getPart('hour')),
            parseInt(getPart('minute')),
            parseInt(getPart('second'))
        );
    } catch (e) {
        console.error('Timezone adjustment failed:', e);
        // Fallback to server time if tz is invalid
    }

    const selections = CategorySelector.select(
        user as unknown as import('@/lib/models/User').IUser, 
        richCandidates as CatalogVideo[], 
        referenceDate
    );

    // 5. Structure for Response
    // We want to preserve the "For You" row as the first one if it exists or if we need to force it.
    // CategorySelector returns sorted list.
    // If 'For You' isn't explicitly in Master Catalog as a "selector" outcome but rather a "force include", we adding it here.
    
    // The Master Catalog has "Jump Back In" etc, but "For You" (Vector Match) is special.
    // Let's create the "For You" row using the raw top scoring candidates, similar to old logic, 
    // OR trust that one of the categories corresponds to "Picked for [Goal]" which is vector match.
    // However, usually "For You" is just the raw mixed bag.
    
    // Let's FORCE "For You" as the first row.
    const forYouVideos = richCandidates.sort((a, b) => (b.score || 0) - (a.score || 0)).slice(0, 10);
    
    const finalCategories = selections.map(s => ({
        name: s.category.label,
        videos: s.videos as HydratedVideo[], // Cast back to HydratedVideo for response
        weight: s.score
    }));

    // Prepend For You
    finalCategories.unshift({
        name: "For You",
        videos: forYouVideos, 
        weight: 1000
    });

    return NextResponse.json({
      success: true,
      recommended: forYouVideos, 
      categories: finalCategories.slice(0, 15)
    });

  } catch (error) {
    console.error('Discover API Error:', error);
    return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 });
  }
}
