import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import dbConnect from '@/lib/mongodb';
import { redis } from '@/lib/redis';
import Progress from '@/lib/models/Progress';
import Video from '@/lib/models/Video';
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

    // 3. Logic B: Deduplication (Filter Watched Videos)
    await dbConnect();
    
    // Fetch all videoIds the user has interacted with (Progress)
    // We assume if a Progress doc exists, they have at least started watching it.
    // Optimisation: .lean() for performance
    // Optimisation: .lean() for performance
    const userProgress = await Progress.find({ userId: userId }).select('videoId').lean() as unknown as { videoId: string }[];
    const watchedVideoIds = new Set(userProgress.map((p) => p.videoId));

    // Filter candidates: Keep only those NOT in watchedVideoIds
    const freshCandidates = candidates.filter(c => !watchedVideoIds.has(c.videoId));

    // 4. Logic C: Hydration & Smart Categorization 

    // Fetch User Preferences for Context-Aware Sorting
    const user = await User.findById(userId).select('preferences.learning');

    // Fetch Videos from MongoDB
    const freshVideoIds = freshCandidates.map(c => c.videoId);
    const videos = await Video.find({ videoId: { $in: freshVideoIds } })
        .select('videoId title thumbnail channelName duration category tags materialsStatus incompleteMaterials summary userId')
        .lean() as unknown as HydratedVideo[];

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
    // We already have 'user' (the document) but we only selected 'preferences.learning'.
    // CategorySelector expects a user-like object with preferences.
    // Ideally we should pass the full user document or ensure the shape matches.
    // We faked the shape essentially above. Let's ensure strict typing or loose casting.
    
    // We need to pass the full 'user' doc if possible, or at least an object with preferences
    // user doc is partial here, so we cast to unknown then Generic User or handle in service better.
    // However, CategorySelector uses 'user.preferences.learning', which we selected.
    const selections = CategorySelector.select(user as unknown as import('@/lib/models/User').IUser, richCandidates as CatalogVideo[], new Date());

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
