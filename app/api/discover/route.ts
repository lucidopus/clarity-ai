import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import dbConnect from '@/lib/mongodb';
import { redis } from '@/lib/redis';
import Progress from '@/lib/models/Progress';
import Video from '@/lib/models/Video';
import User from '@/lib/models/User';

// Type definitions for the Candidate object stored in Redis
interface RedisCandidate {
  _id: string; // Mongo ID
  videoId: string; // YouTube ID
  score: number;
  category?: string;
  title?: string;
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
    const userProgress = await Progress.find({ userId: userId }).select('videoId').lean();
    const watchedVideoIds = new Set(userProgress.map((p: any) => p.videoId));

    // Filter candidates: Keep only those NOT in watchedVideoIds
    const freshCandidates = candidates.filter(c => !watchedVideoIds.has(c.videoId));

    console.log(`User ${userId}: ${candidates.length} candidates -> ${freshCandidates.length} fresh (removed ${candidates.length - freshCandidates.length} watched)`);


    // 4. Logic C: Hydration & Smart Categorization 

    // Fetch User Preferences for Context-Aware Sorting
    const user = await User.findById(userId).select('preferences.learning');
    const prefs = user?.preferences?.learning || {};
    const role = prefs.role || '';
    const dailyTime = prefs.dailyTimeMinutes || 30; // Default 30m
    const goals = (prefs.learningGoals || []).join(' ').toLowerCase();

    // A) Hydrate: Fetch rich metadata from MongoDB
    const freshVideoIds = freshCandidates.map(c => c.videoId);
    const videos = await Video.find({ videoId: { $in: freshVideoIds } })
        .select('videoId title thumbnail channelName duration category tags materialsStatus incompleteMaterials summary userId')
        .lean();

    // B) Fetch author usernames
    const uniqueUserIds = [...new Set(videos.map((v: any) => v.userId?.toString()).filter(Boolean))];
    const users = await User.find({ _id: { $in: uniqueUserIds } }).select('_id username').lean();
    const usernameMap = new Map(users.map((u: any) => [u._id.toString(), u.username]));

    const scoreMap = new Map(freshCandidates.map(c => [c.videoId, c.score]));
    
    const richCandidates = videos.map((v: any) => ({
        ...v,
        score: scoreMap.get(v.videoId) || 0,
        durationSeconds: v.duration || 0,
        authorUsername: v.userId ? usernameMap.get(v.userId.toString()) : undefined
    }));

    // B) Row Builders
    interface CategoryRow {
        name: string;
        videos: any[];
        weight: number; // For sorting rows
    }
    
    const rows: CategoryRow[] = [];
    const usedVideoIds = new Set<string>();

    const addRow = (name: string, filterFn: (v: any) => boolean, limit = 10, baseWeight = 0) => {
        const matches = richCandidates
            .filter(v => filterFn(v) && !usedVideoIds.has(v.videoId))
            .sort((a: any, b: any) => b.score - a.score);
        
        if (matches.length > 0) {
            const selectedVideos = matches.slice(0, limit);
            selectedVideos.forEach((v: any) => usedVideoIds.add(v.videoId)); // Track used IDs

            rows.push({
                name,
                videos: selectedVideos,
                weight: baseWeight
            });
        }
    };

    // --- ROW 1: "For You" ---
    // Always top priority
    // Always top priority
    const forYouVideos = richCandidates.sort((a: any, b: any) => b.score - a.score).slice(0, 10);
    forYouVideos.forEach((v: any) => usedVideoIds.add(v.videoId));
    
    rows.push({
        name: "For You",
        videos: forYouVideos,
        weight: 1000 // Ensure #1
    });

    // --- ROW 2: "Quick Wins" ---
    // Boost if user has little time (< 20m)
    let quickWinsWeight = 10;
    if (dailyTime <= 20) quickWinsWeight += 50;
    addRow("Quick Wins (< 5 min)", v => v.durationSeconds > 0 && v.durationSeconds <= 300, 10, quickWinsWeight);

    // --- ROW 3: "Lunch Break Learning" ---
    // Good for average time (20-45m)
    let lunchWeight = 10;
    if (dailyTime > 20 && dailyTime <= 45) lunchWeight += 30;
    addRow("Lunch Break Learning", v => v.durationSeconds > 900 && v.durationSeconds <= 1800, 10, lunchWeight);

    // --- ROW 4: "Deep Dives" ---
    // Boost if user has lots of time (> 60m)
    let deepDiveWeight = 10;
    if (dailyTime >= 60) deepDiveWeight += 50;
    addRow("Deep Dives", v => v.durationSeconds > 2700, 10, deepDiveWeight);

    // --- ROW 5: "Code & Build" (Tech) ---
    // Boost if goal/role related to coding
    let codeWeight = 5;
    if (goals.includes('code') || goals.includes('program') || role === 'Content Creator') codeWeight += 40; // Creators often edit/tech
    if (role === 'Student' && (goals.includes('computer') || goals.includes('tech'))) codeWeight += 40;
    
    addRow("Code & Build", v => 
        v.category === 'Technology & Coding' || 
        v.tags?.some((t: string) => ['programming', 'code', 'developer', 'software'].includes(t.toLowerCase())),
        10, codeWeight
    );

    // --- ROW 6: "Creator's Studio" ---
    let creatorWeight = 5;
    if (role === 'Content Creator') creatorWeight += 60;
    if (goals.includes('design') || goals.includes('art')) creatorWeight += 30;
    
    addRow("Creator's Studio", v => 
        v.category === 'Arts & Design' || 
        v.tags?.some((t: string) => ['design', 'editing', 'creative', 'art'].includes(t.toLowerCase())),
        10, creatorWeight
    );

    // --- ROW 7: "Entrepreneur Essentials" ---
    let bizWeight = 5;
    if (role === 'Working Professional') bizWeight += 30;
    if (goals.includes('startup') || goals.includes('business')) bizWeight += 40;

    addRow("Entrepreneur Essentials", v => 
        v.category === 'Business & Finance' || 
        v.title?.toLowerCase().includes('startup') ||
        v.title?.toLowerCase().includes('business'),
        10, bizWeight
    );

    // --- ROW 8: "Visual Learners" ---
    // Boost if preferredMaterials includes visuals
    // We check `prefs.preferredMaterialsRanked`
    let visualWeight = 5;
    const materials = (prefs.preferredMaterialsRanked || []).map((m: string) => m.toLowerCase());
    if (materials.some((m: string) => m.includes('visual') || m.includes('mind map') || m.includes('video'))) visualWeight += 20;

    addRow("Visual Learning", v => 
        (v.materialsStatus === 'complete' && !v.incompleteMaterials?.includes('mindmap')) ||
        v.tags?.includes('mindmap'),
        10, visualWeight
    );

    // --- ROW 9: "Interactive Sessions" ---
    // Boost if quizzes
    let interactiveWeight = 5;
    if (materials.some((m: string) => m.includes('quiz') || m.includes('interactive'))) interactiveWeight += 20;

    addRow("Interactive Sessions", v => 
        (v.materialsStatus === 'complete' && !v.incompleteMaterials?.includes('quizzes')) ||
        v.tags?.includes('quiz'),
        10, interactiveWeight
    );

    // --- Generic Category Fallback ---
     const categoriesFound = new Set(richCandidates.map((v: any) => v.category).filter(Boolean));
    categoriesFound.forEach((cat: any) => {
        if (rows.length >= 20) return;
        if (['Arts & Design', 'Technology & Coding', 'Business & Finance'].includes(cat)) return; 
        
        const label = cat === 'Other' ? 'Explore' : cat;
        if (!rows.find(r => r.name === label)) {
             // Generic rows have low base weight (0)
             addRow(label, v => v.category === cat, 10, 0);
        }
    });

    // Final Sort by Weight
    rows.sort((a, b) => b.weight - a.weight);

    return NextResponse.json({
      success: true,
      recommended: rows[0].videos, // Logic C: Top row is dynamically chosen (usually For You)
      categories: rows.map(({ name, videos }) => ({ name, videos })).slice(0, 15) // Return clean objects
    });

  } catch (error) {
    console.error('Discover API Error:', error);
    return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 });
  }
}
