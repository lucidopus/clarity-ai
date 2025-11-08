import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import dbConnect from '@/lib/mongodb';
import { ActivityLog, Flashcard, Video } from '@/lib/models';
import mongoose from 'mongoose';

interface DecodedToken { userId: string }

// Activity type to friendly label mapping
const ACTIVITY_LABELS: Record<string, string> = {
  'chatbot_message_sent': 'Chatbot Q&A',
  'flashcard_viewed': 'Flashcard Viewed',
  'flashcard_mastered': 'Flashcard Mastered',
  'quiz_completed': 'Quiz Completed',
  'video_generated': 'Video Generated',
  'flashcard_created': 'Flashcard Created',
  'materials_viewed': 'Materials Viewed',
};

// Desired funnel order (top to bottom)
const FUNNEL_ORDER = [
  'chatbot_message_sent',
  'flashcard_viewed',
  'flashcard_mastered',
  'quiz_completed',
  'video_generated',
];

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('jwt')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { userId } = jwt.verify(token, process.env.JWT_SECRET!) as DecodedToken;

    await dbConnect();

    // Get user's timezone from most recent ActivityLog, fallback to query param or UTC
    const clientTimeZone = request.nextUrl.searchParams.get('timezone') || 'UTC';

    // Try to get timezone from most recent activity log
    let userTimeZone = clientTimeZone;
    const recentLog = await ActivityLog.findOne(
      { userId: new mongoose.Types.ObjectId(userId) },
      { 'metadata.clientTimeZone': 1 }
    ).sort({ timestamp: -1 }).limit(1);

    if (recentLog?.metadata?.clientTimeZone) {
      userTimeZone = recentLog.metadata.clientTimeZone as string;
    }

    // Date ranges
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const sixWeeksAgo = new Date(now.getTime() - 6 * 7 * 24 * 60 * 60 * 1000);

    // 1. Focus Hours (last 30 days, by hour-of-day)
    const focusHoursData = await ActivityLog.aggregate([
      {
        $match: {
          userId: new mongoose.Types.ObjectId(userId),
          timestamp: { $gte: thirtyDaysAgo },
        },
      },
      {
        $group: {
          _id: {
            $hour: {
              date: '$timestamp',
              timezone: userTimeZone,
            },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Fill in missing hours (0-23)
    const focusHoursBuckets = Array.from({ length: 24 }, (_, i) => {
      const found = focusHoursData.find((d) => d._id === i);
      return {
        hour: i,
        count: found ? found.count : 0,
      };
    });

    // 2. Activity Funnel (last 7 days)
    const funnelData = await ActivityLog.aggregate([
      {
        $match: {
          userId: new mongoose.Types.ObjectId(userId),
          timestamp: { $gte: sevenDaysAgo },
        },
      },
      {
        $group: {
          _id: '$activityType',
          count: { $sum: 1 },
        },
      },
    ]);

    const funnelMap = new Map(funnelData.map((d) => [d._id, d.count]));
    const activityFunnel = FUNNEL_ORDER.map((type) => ({
      activityType: type,
      label: ACTIVITY_LABELS[type] || type,
      count: funnelMap.get(type) || 0,
    }));

    // 3. Video Engagement (last 30 days, top 5 videos)
    const videoEngagementData = await ActivityLog.aggregate([
      {
        $match: {
          userId: new mongoose.Types.ObjectId(userId),
          timestamp: { $gte: thirtyDaysAgo },
          videoId: { $exists: true, $ne: null },
        },
      },
      {
        $group: {
          _id: '$videoId',
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 5 },
    ]);

    // Lookup video details
    const videoIds = videoEngagementData.map((d) => d._id);
    const videos = await Video.find(
      { videoId: { $in: videoIds }, userId: new mongoose.Types.ObjectId(userId) },
      { videoId: 1, title: 1, thumbnail: 1 }
    ).lean();

    const videoMap = new Map(videos.map((v) => [v.videoId, v]));

    const totalInteractions = videoEngagementData.reduce((sum, d) => sum + d.count, 0);

    const videoEngagement = videoEngagementData.map((d) => {
      const video = videoMap.get(d._id);
      return {
        videoId: d._id,
        title: video?.title || 'Unknown Video',
        thumbnail: video?.thumbnail || null,
        interactions: d.count,
        percentage: totalInteractions > 0 ? Math.round((d.count / totalInteractions) * 100) : 0,
      };
    });

    // 4. Flashcard Difficulty (all flashcards for this user)
    const flashcardDifficultyData = await Flashcard.aggregate([
      {
        $match: {
          userId: new mongoose.Types.ObjectId(userId),
          generationType: 'ai', // Only AI-generated cards have difficulty
        },
      },
      {
        $group: {
          _id: '$difficulty',
          count: { $sum: 1 },
        },
      },
    ]);

    const totalCards = flashcardDifficultyData.reduce((sum, d) => sum + d.count, 0);

    const flashcardDifficulty = ['easy', 'medium', 'hard'].map((level) => {
      const found = flashcardDifficultyData.find((d) => d._id === level);
      const count = found ? found.count : 0;
      return {
        difficulty: level,
        count,
        percentage: totalCards > 0 ? Math.round((count / totalCards) * 100) : 0,
      };
    });

    // 5. Weekday Consistency (last 6 weeks)
    const weekdayData = await ActivityLog.aggregate([
      {
        $match: {
          userId: new mongoose.Types.ObjectId(userId),
          timestamp: { $gte: sixWeeksAgo },
        },
      },
      {
        $group: {
          _id: {
            $isoDayOfWeek: {
              date: '$timestamp',
              timezone: userTimeZone,
            },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Calculate weekday consistency data
    const weekdayConsistency = Array.from({ length: 7 }, (_, i) => {
      const dayOfWeek = i + 1; // 1 = Monday, 7 = Sunday
      const found = weekdayData.find((d) => d._id === dayOfWeek);
      const count = found ? found.count : 0;

      // Get weekday label
      const date = new Date(2025, 0, 6 + i); // Jan 6, 2025 is a Monday
      const label = new Intl.DateTimeFormat('en-US', { weekday: 'short' }).format(date);

      return {
        dayOfWeek,
        label,
        count,
        activeDays: 0, // We'll calculate this differently - just show raw counts for now
      };
    });

    return NextResponse.json(
      {
        generatedAt: new Date().toISOString(),
        timezone: userTimeZone,
        focusHours: focusHoursBuckets,
        activityFunnel,
        videoEngagement,
        flashcardDifficulty,
        weekdayConsistency,
      },
      {
        headers: {
          'Cache-Control': 'no-store, must-revalidate',
          Pragma: 'no-cache',
          Expires: '0',
        },
      }
    );
  } catch (error) {
    console.error('Failed to load dashboard insights', error);
    return NextResponse.json({ error: 'Failed to load insights' }, { status: 500 });
  }
}
