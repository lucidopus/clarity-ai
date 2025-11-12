import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User from '@/lib/models/User';
import Video from '@/lib/models/Video';
import LearningMaterial from '@/lib/models/LearningMaterial';
import ActivityLog from '@/lib/models/ActivityLog';
import { withAdminAuth } from '@/lib/admin-middleware';

async function handleGET(request: NextRequest) {
  try {
    await dbConnect();

    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Get total users
    const totalUsers = await User.countDocuments();

    // Get users registered in last 30 days
    const newUsersLast30Days = await User.countDocuments({
      createdAt: { $gte: thirtyDaysAgo },
    });

    // Get active users (users who logged in within last 7 days)
    const activeUsersLast7Days = await User.countDocuments({
      lastLoginDate: { $gte: sevenDaysAgo },
    });

    // Get total videos processed
    const totalVideos = await Video.countDocuments();

    // Get videos processed in last 30 days
    const videosLast30Days = await Video.countDocuments({
      createdAt: { $gte: thirtyDaysAgo },
    });

    // Get total generations count
    const generationCounts = await LearningMaterial.aggregate([
      {
        $group: {
          _id: null,
          totalFlashcards: {
            $sum: { $cond: [{ $isArray: '$flashcards' }, { $size: '$flashcards' }, 0] },
          },
          totalQuizzes: {
            $sum: { $cond: [{ $isArray: '$quizzes' }, { $size: '$quizzes' }, 0] },
          },
          totalPrerequisites: {
            $sum: { $cond: [{ $isArray: '$prerequisites' }, { $size: '$prerequisites' }, 0] },
          },
          totalTimestamps: {
            $sum: { $cond: [{ $isArray: '$timestamps' }, { $size: '$timestamps' }, 0] },
          },
        },
      },
    ]);

    const generations = generationCounts[0] || {
      totalFlashcards: 0,
      totalQuizzes: 0,
      totalPrerequisites: 0,
      totalTimestamps: 0,
    };

    // Get total activity count
    const totalActivities = await ActivityLog.countDocuments();

    // Get activities in last 30 days
    const activitiesLast30Days = await ActivityLog.countDocuments({
      timestamp: { $gte: thirtyDaysAgo },
    });

    // Calculate average streak
    const streakStats = await User.aggregate([
      {
        $group: {
          _id: null,
          avgLoginStreak: { $avg: '$loginStreak' },
          avgLongestStreak: { $avg: '$longestStreak' },
          maxLoginStreak: { $max: '$loginStreak' },
        },
      },
    ]);

    const streaks = streakStats[0] || {
      avgLoginStreak: 0,
      avgLongestStreak: 0,
      maxLoginStreak: 0,
    };

    // Get top active users
    const topActiveUsers = await User.find()
      .select('_id username firstName lastName loginStreak longestStreak')
      .sort({ loginStreak: -1 })
      .limit(5)
      .lean();

    return NextResponse.json({
      success: true,
      data: {
        users: {
          total: totalUsers,
          newLast30Days: newUsersLast30Days,
          activeLast7Days: activeUsersLast7Days,
        },
        videos: {
          total: totalVideos,
          processedLast30Days: videosLast30Days,
        },
        generations: {
          totalFlashcards: generations.totalFlashcards,
          totalQuizzes: generations.totalQuizzes,
          totalPrerequisites: generations.totalPrerequisites,
          totalTimestamps: generations.totalTimestamps,
          grandTotal:
            generations.totalFlashcards +
            generations.totalQuizzes +
            generations.totalPrerequisites +
            generations.totalTimestamps,
        },
        activity: {
          total: totalActivities,
          last30Days: activitiesLast30Days,
        },
        streaks: {
          average: Math.round(streaks.avgLoginStreak * 10) / 10,
          longestAverage: Math.round(streaks.avgLongestStreak * 10) / 10,
          maxStreak: streaks.maxLoginStreak,
        },
        topActiveUsers: topActiveUsers.map((user) => ({
          id: user._id.toString(),
          username: user.username,
          name: `${user.firstName} ${user.lastName}`,
          currentStreak: user.loginStreak || 0,
          longestStreak: user.longestStreak || 0,
        })),
      },
    });
  } catch (error) {
    console.error('Admin Summary Analytics Error:', error);
    return NextResponse.json(
      { success: false, message: 'Server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  return withAdminAuth(request, handleGET);
}
