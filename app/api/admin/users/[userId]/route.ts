import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminToken } from '@/lib/adminAuth';
import dbConnect from '@/lib/mongodb';
import User from '@/lib/models/User';
import Video from '@/lib/models/Video';
import Flashcard from '@/lib/models/Flashcard';
import Quiz from '@/lib/models/Quiz';
import LearningMaterial from '@/lib/models/LearningMaterial';
import Progress from '@/lib/models/Progress';
import ActivityLog from '@/lib/models/ActivityLog';
import Note from '@/lib/models/Note';
import MindMap from '@/lib/models/MindMap';
import Solution from '@/lib/models/Solution';
import Cost from '@/lib/models/Cost';
import mongoose from 'mongoose';
import { startOfDay, subDays } from 'date-fns';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
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

    const { userId } = await params;

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid user ID',
        },
        { status: 400 }
      );
    }

    await dbConnect();

    // Get user details
    interface UserDocument {
      _id: mongoose.Types.ObjectId;
      username: string;
      email: string;
      firstName: string;
      lastName: string;
      userType: string;
      customUserType?: string;
      preferences?: Record<string, unknown>;
      createdAt: Date;
      updatedAt: Date;
      lastLoginDate?: Date;
      loginStreak?: number;
      longestStreak?: number;
    }

    const user = await User.findById(userId)
      .select('-passwordHash')
      .lean() as UserDocument | null;

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message: 'User not found',
        },
        { status: 404 }
      );
    }

    // Get all videos with details
    interface VideoDocument {
      _id: mongoose.Types.ObjectId;
      videoId: string;
      title: string;
      thumbnail?: string;
      createdAt: Date;
      processingStatus: string;
    }

    const videos = (await Video.find({ userId })
      .select('_id videoId title thumbnail createdAt processingStatus')
      .sort({ createdAt: -1 })
      .lean()) as unknown as VideoDocument[];

    // Get generation counts by video
    const videosWithCounts = await Promise.all(
      videos.map(async (video) => {
        const [flashcardCount, quizCount, hasLearningMaterial, hasMindMap, hasNotes] = await Promise.all([
          Flashcard.countDocuments({ userId, videoId: video.videoId }),
          Quiz.countDocuments({ userId, videoId: video.videoId }),
          LearningMaterial.exists({ userId, videoId: video.videoId }),
          MindMap.exists({ userId, videoId: video.videoId }),
          Note.exists({ userId, videoId: video.videoId }),
        ]);

        return {
          id: String(video._id),
          videoId: video.videoId,
          title: video.title,
          thumbnail: video.thumbnail,
          createdAt: video.createdAt,
          processingStatus: video.processingStatus,
          stats: {
            flashcards: flashcardCount,
            quizzes: quizCount,
            hasLearningMaterial: !!hasLearningMaterial,
            hasMindMap: !!hasMindMap,
            hasNotes: !!hasNotes,
          },
        };
      })
    );

    // Get activity summary
    const [totalActivities, activityBreakdown] = await Promise.all([
      ActivityLog.countDocuments({ userId }),
      ActivityLog.aggregate([
        { $match: { userId: new mongoose.Types.ObjectId(userId) } },
        { $group: { _id: '$activityType', count: { $sum: 1 } } },
      ]),
    ]);

    const activityStats = activityBreakdown.reduce(
      (acc: Record<string, number>, item: { _id: string; count: number }) => {
        acc[item._id] = item.count;
        return acc;
      },
      {}
    );

    // Get total counts - convert userId to ObjectId for proper comparison
    const userObjectId = new mongoose.Types.ObjectId(userId);
    const [totalFlashcards, totalQuizzes, totalNotes, totalMindMaps, totalSolutions] = await Promise.all([
      Flashcard.countDocuments({ userId: userObjectId }),
      Quiz.countDocuments({ userId: userObjectId }),
      Note.countDocuments({ userId: userObjectId }),
      MindMap.countDocuments({ userId: userObjectId }),
      Solution.countDocuments({ userId: userObjectId }),
    ]);

    // Get cost data
    const costData = await Cost.aggregate([
      { $match: { userId: userObjectId } },
      {
        $group: {
          _id: null,
          totalCost: { $sum: '$totalCost' },
          operations: { $sum: 1 },
        }
      }
    ]);

    const totalCost = costData.length > 0 ? parseFloat(costData[0].totalCost.toFixed(6)) : 0;
    const totalCostOperations = costData.length > 0 ? costData[0].operations : 0;

    // Calculate daily average for last 7 days
    const last7Days = startOfDay(subDays(new Date(), 7));
    const dailyCosts = await Cost.aggregate([
      {
        $match: {
          userId: userObjectId,
          createdAt: { $gte: last7Days }
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          dailyCost: { $sum: '$totalCost' }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    const avgDailyCost = dailyCosts.length > 0
      ? dailyCosts.reduce((sum, day) => sum + day.dailyCost, 0) / dailyCosts.length
      : 0;

    // Get cost breakdown by source
    const costBySource = await Cost.aggregate([
      { $match: { userId: userObjectId } },
      {
        $group: {
          _id: '$source',
          count: { $sum: 1 },
          totalCost: { $sum: '$totalCost' }
        }
      }
    ]);

    const recentOperations = costBySource.map(item => ({
      source: item._id,
      count: item.count,
      cost: parseFloat(item.totalCost.toFixed(6))
    }));

    return NextResponse.json({
      success: true,
      user: {
        id: String(user._id),
        username: user.username,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        userType: user.userType,
        customUserType: user.customUserType,
        preferences: user.preferences,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        lastLoginDate: user.lastLoginDate || null,
        loginStreak: user.loginStreak || 0,
        longestStreak: user.longestStreak || 0,
      },
      videos: videosWithCounts,
      stats: {
        totalVideos: videos.length,
        totalFlashcards,
        totalQuizzes,
        totalNotes,
        totalMindMaps,
        totalSolutions,
        totalActivities,
        activityBreakdown: activityStats,
      },
      cost: {
        totalCost,
        operations: totalCostOperations,
        avgDailyCost: parseFloat(avgDailyCost.toFixed(6)),
        last7Days: dailyCosts.map(day => ({
          date: day._id,
          cost: parseFloat(day.dailyCost.toFixed(6))
        })),
        recentOperations,
      },
    });
  } catch (error) {
    console.error('Admin user details error:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Server error',
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
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

    const { userId } = await params;

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid user ID',
        },
        { status: 400 }
      );
    }

    await dbConnect();

    // Check if user exists
    const user = await User.findById(userId);

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message: 'User not found',
        },
        { status: 404 }
      );
    }

    // Cascade delete all user data
    await Promise.all([
      Video.deleteMany({ userId }),
      Flashcard.deleteMany({ userId }),
      Quiz.deleteMany({ userId }),
      LearningMaterial.deleteMany({ userId }),
      Progress.deleteMany({ userId }),
      ActivityLog.deleteMany({ userId }),
      Note.deleteMany({ userId }),
      MindMap.deleteMany({ userId }),
      Solution.deleteMany({ userId }),
      Cost.deleteMany({ userId }),
      User.findByIdAndDelete(userId),
    ]);

    return NextResponse.json({
      success: true,
      message: 'User and all associated data deleted successfully',
    });
  } catch (error) {
    console.error('Admin user deletion error:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Server error',
      },
      { status: 500 }
    );
  }
}
