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
import mongoose from 'mongoose';

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
    const user: any = await User.findById(userId)
      .select('-passwordHash')
      .lean();

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
    const videos = await Video.find({ userId })
      .select('_id videoId title thumbnail createdAt processingStatus')
      .sort({ createdAt: -1 })
      .lean();

    // Get generation counts by video
    const videosWithCounts = await Promise.all(
      videos.map(async (video: any) => {
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

    // Get total counts
    const [totalFlashcards, totalQuizzes, totalNotes, totalMindMaps, totalSolutions] = await Promise.all([
      Flashcard.countDocuments({ userId }),
      Quiz.countDocuments({ userId }),
      Note.countDocuments({ userId }),
      MindMap.countDocuments({ userId }),
      Solution.countDocuments({ userId }),
    ]);

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
