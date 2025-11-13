import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminToken } from '@/lib/adminAuth';
import dbConnect from '@/lib/mongodb';
import User from '@/lib/models/User';
import Video from '@/lib/models/Video';
import Flashcard from '@/lib/models/Flashcard';
import Quiz from '@/lib/models/Quiz';
import ActivityLog from '@/lib/models/ActivityLog';

export async function GET(request: NextRequest) {
  try {
    // Verify admin authentication
    const isAdmin = await verifyAdminToken(request);

    if (!isAdmin) {
      return NextResponse.json(
        {
          success: false,
          message: 'Unauthorized',
        },
        { status: 401 }
      );
    }

    await dbConnect();

    // Calculate date thresholds
    const now = new Date();
    const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Get total counts and active users
    const [
      totalUsers,
      totalVideos,
      totalFlashcards,
      totalQuizzes,
      totalActivities,
      newUsersLast7Days,
      newUsersLast30Days,
    ] = await Promise.all([
      User.countDocuments(),
      Video.countDocuments(),
      Flashcard.countDocuments(),
      Quiz.countDocuments(),
      ActivityLog.countDocuments(),
      User.countDocuments({ createdAt: { $gte: last7Days } }),
      User.countDocuments({ createdAt: { $gte: last30Days } }),
    ]);

    // Get active users (users with activity who still exist in the system)
    const activeUserIdsLast7Days = await ActivityLog.distinct('userId', {
      timestamp: { $gte: last7Days },
    });
    const activeUserIdsLast30Days = await ActivityLog.distinct('userId', {
      timestamp: { $gte: last30Days },
    });

    // Verify these users still exist in the User collection
    const [activeUsersLast7Days, activeUsersLast30Days] = await Promise.all([
      User.countDocuments({ _id: { $in: activeUserIdsLast7Days } }),
      User.countDocuments({ _id: { $in: activeUsersLast30Days } }),
    ]);

    // Get activity breakdown
    const activityBreakdown = await ActivityLog.aggregate([
      { $group: { _id: '$activityType', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    const activityStats = activityBreakdown.reduce(
      (acc: Record<string, number>, item: { _id: string; count: number }) => {
        acc[item._id] = item.count;
        return acc;
      },
      {}
    );

    // Get average generations per user (as integers)
    const avgVideosPerUser = totalUsers > 0 ? Math.round(totalVideos / totalUsers) : 0;
    const avgFlashcardsPerUser = totalUsers > 0 ? Math.round(totalFlashcards / totalUsers) : 0;
    const avgQuizzesPerUser = totalUsers > 0 ? Math.round(totalQuizzes / totalUsers) : 0;

    return NextResponse.json({
      success: true,
      summary: {
        users: {
          total: totalUsers,
          activeLastWeek: activeUsersLast7Days,
          activeLastMonth: activeUsersLast30Days,
          newLastWeek: newUsersLast7Days,
          newLastMonth: newUsersLast30Days,
        },
        content: {
          totalVideos,
          totalFlashcards,
          totalQuizzes,
          totalActivities,
          avgVideosPerUser,
          avgFlashcardsPerUser,
          avgQuizzesPerUser,
        },
        activityBreakdown: activityStats,
      },
    });
  } catch (error) {
    console.error('Admin analytics summary error:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Server error',
      },
      { status: 500 }
    );
  }
}
