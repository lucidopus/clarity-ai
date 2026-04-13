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
import Source from '@/lib/models/Source';
import Cost from '@/lib/models/Cost';
import SourceContent from '@/lib/models/SourceContent';
import LiveSession from '@/lib/models/LiveSession';
import { deleteSupabaseFiles } from '@/lib/supabase';
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

    // Batch-fetch all generation counts in 5 aggregate queries (instead of 5N)
    const videoIds = videos.map((v) => v.videoId);

    type CountRow = { _id: string; count: number };
    const [flashcardCounts, quizCounts, lmIds, mindmapIds, noteIds] = await Promise.all([
      Flashcard.aggregate<CountRow>([
        { $match: { userId, sourceId: { $in: videoIds } } },
        { $group: { _id: '$sourceId', count: { $sum: 1 } } },
      ]),
      Quiz.aggregate<CountRow>([
        { $match: { userId, sourceId: { $in: videoIds } } },
        { $group: { _id: '$sourceId', count: { $sum: 1 } } },
      ]),
      LearningMaterial.distinct('sourceId', { userId, sourceId: { $in: videoIds } }) as Promise<string[]>,
      MindMap.distinct('sourceId', { userId, sourceId: { $in: videoIds } }) as Promise<string[]>,
      Note.distinct('sourceId', { userId, sourceId: { $in: videoIds } }) as Promise<string[]>,
    ]);

    const fcMap = new Map(flashcardCounts.map((r) => [r._id, r.count]));
    const qzMap = new Map(quizCounts.map((r) => [r._id, r.count]));
    const lmSet = new Set(lmIds);
    const mmSet = new Set(mindmapIds);
    const ntSet = new Set(noteIds);

    const videosWithCounts = videos.map((video) => ({
      id: String(video._id),
      videoId: video.videoId,
      title: video.title,
      thumbnail: video.thumbnail,
      createdAt: video.createdAt,
      processingStatus: video.processingStatus,
      stats: {
        flashcards: fcMap.get(video.videoId) ?? 0,
        quizzes: qzMap.get(video.videoId) ?? 0,
        hasLearningMaterial: lmSet.has(video.videoId),
        hasMindMap: mmSet.has(video.videoId),
        hasNotes: ntSet.has(video.videoId),
      },
    }));

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

    // Clean up uploaded files from Supabase Storage
    const sources = await Source.find({ userId, fileUrl: { $exists: true, $ne: null } }, { fileUrl: 1 }).lean();
    const fileUrls = sources.map((s) => s.fileUrl).filter((url): url is string => !!url);
    if (fileUrls.length > 0) {
      await deleteSupabaseFiles(fileUrls);
    }

    // Cascade delete all user data within a transaction for atomicity
    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        await Promise.all([
          Video.deleteMany({ userId }, { session }),
          Source.deleteMany({ userId }, { session }),
          Flashcard.deleteMany({ userId }, { session }),
          Quiz.deleteMany({ userId }, { session }),
          LearningMaterial.deleteMany({ userId }, { session }),
          Progress.deleteMany({ userId }, { session }),
          ActivityLog.deleteMany({ userId }, { session }),
          Note.deleteMany({ userId }, { session }),
          MindMap.deleteMany({ userId }, { session }),
          Solution.deleteMany({ userId }, { session }),
          Cost.deleteMany({ userId }, { session }),
          SourceContent.deleteMany({ userId }, { session }),
          LiveSession.deleteMany({ userId }, { session }),
          User.findByIdAndDelete(userId, { session }),
        ]);
      });
    } finally {
      await session.endSession();
    }

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
