import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User from '@/lib/models/User';
import Video from '@/lib/models/Video';
import LearningMaterial from '@/lib/models/LearningMaterial';
import MindMap from '@/lib/models/MindMap';
import Note from '@/lib/models/Note';
import Solution from '@/lib/models/Solution';
import Flashcard from '@/lib/models/Flashcard';
import Quiz from '@/lib/models/Quiz';
import Progress from '@/lib/models/Progress';
import ActivityLog from '@/lib/models/ActivityLog';
import { withAdminAuth } from '@/lib/admin-middleware';

async function handleGET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();
    const { id } = await params;

    // Get user details
    const user = await User.findById(id)
      .select('-passwordHash')
      .lean();

    if (!user) {
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      );
    }

    // Get all videos for this user
    const videos = await Video.find({ userId: id })
      .select('_id videoId title thumbnail createdAt')
      .sort({ createdAt: -1 })
      .lean();

    const youtubeVideoIds = videos.map((v) => v.videoId); // YouTube IDs, not MongoDB _id

    // Get detailed generation data for each video
    const generationsData = await Promise.all(
      videos.map(async (video) => {
        const youtubeId = video.videoId; // YouTube video ID like "dQw4w9WgXcQ"

        // Get learning materials (uses YouTube videoId)
        const material = await LearningMaterial.findOne({ videoId: youtubeId }).lean();

        // Get flashcards (separate collection, uses YouTube videoId)
        const flashcards = await Flashcard.find({ videoId: youtubeId }).lean();

        // Get quizzes (separate collection, uses YouTube videoId)
        const quizzes = await Quiz.find({ videoId: youtubeId }).lean();

        // Get mind maps
        const mindMaps = await MindMap.find({ videoId: youtubeId }).lean();

        // Get notes
        const notes = await Note.find({ videoId: youtubeId }).lean();

        // Get solutions
        const solutions = await Solution.find({ videoId: youtubeId }).lean();

        return {
          videoId: video._id,
          videoYouTubeId: video.videoId,
          title: video.title,
          thumbnailUrl: video.thumbnail,
          createdAt: video.createdAt,
          materials: {
            flashcards: flashcards.length,
            quizzes: quizzes.length,
            prerequisites: material?.prerequisites?.length || 0,
            timestamps: material?.timestamps?.length || 0,
            mindMaps: mindMaps.length,
            notes: notes.length,
            solutions: solutions.length,
            userFlashcards: flashcards.filter((f) => f.generationType === 'human').length,
          },
          materialIds: {
            learningMaterialId: material?._id?.toString(),
            flashcardIds: flashcards.map((f) => f._id.toString()),
            quizIds: quizzes.map((q) => q._id.toString()),
            mindMapIds: mindMaps.map((m) => m._id.toString()),
            noteIds: notes.map((n) => n._id.toString()),
            solutionIds: solutions.map((s) => s._id.toString()),
          },
        };
      })
    );

    // Get activity summary
    const activityLogs = await ActivityLog.find({ userId: id })
      .sort({ timestamp: -1 })
      .limit(10)
      .lean();

    // Get progress data
    const progress = await Progress.find({ userId: id }).lean();

    // Calculate total generations
    const totalGenerations = {
      flashcards: generationsData.reduce((sum, g) => sum + g.materials.flashcards, 0),
      quizzes: generationsData.reduce((sum, g) => sum + g.materials.quizzes, 0),
      prerequisites: generationsData.reduce((sum, g) => sum + g.materials.prerequisites, 0),
      timestamps: generationsData.reduce((sum, g) => sum + g.materials.timestamps, 0),
      mindMaps: generationsData.reduce((sum, g) => sum + g.materials.mindMaps, 0),
      notes: generationsData.reduce((sum, g) => sum + g.materials.notes, 0),
      solutions: generationsData.reduce((sum, g) => sum + g.materials.solutions, 0),
      userFlashcards: generationsData.reduce((sum, g) => sum + g.materials.userFlashcards, 0),
    };

    return NextResponse.json({
      success: true,
      data: {
        user: {
          id: user._id.toString(),
          username: user.username,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          userType: user.userType,
          customUserType: user.customUserType,
          preferences: user.preferences,
          registrationDate: user.createdAt,
          lastLoginDate: user.lastLoginDate,
          loginStreak: user.loginStreak || 0,
          longestStreak: user.longestStreak || 0,
        },
        stats: {
          videosProcessed: videos.length,
          totalGenerations,
          activityCount: activityLogs.length,
          progressRecords: progress.length,
        },
        videos: generationsData,
        recentActivity: activityLogs.map((log) => ({
          id: log._id.toString(),
          type: log.activityType,
          timestamp: log.timestamp,
          metadata: log.metadata,
        })),
      },
    });
  } catch (error) {
    console.error('Admin User Detail Error:', error);
    return NextResponse.json(
      { success: false, message: 'Server error' },
      { status: 500 }
    );
  }
}

async function handleDELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();
    const { id } = await params;

    // Verify user exists
    const user = await User.findById(id);
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      );
    }

    // Get all videos for this user to cascade deletion
    const videos = await Video.find({ userId: id }).select('videoId').lean();
    const youtubeVideoIds = videos.map((v) => v.videoId); // YouTube IDs

    // Cascade delete all related data
    await Promise.all([
      // Delete all videos
      Video.deleteMany({ userId: id }),
      // Delete all learning materials for user's videos (uses YouTube videoId)
      LearningMaterial.deleteMany({ videoId: { $in: youtubeVideoIds } }),
      // Delete all mind maps
      MindMap.deleteMany({ videoId: { $in: youtubeVideoIds } }),
      // Delete all notes
      Note.deleteMany({ videoId: { $in: youtubeVideoIds } }),
      // Delete all quizzes
      Quiz.deleteMany({ videoId: { $in: youtubeVideoIds } }),
      // Delete all user flashcards
      Flashcard.deleteMany({ videoId: { $in: youtubeVideoIds } }),
      // Delete all solutions
      Solution.deleteMany({ videoId: { $in: youtubeVideoIds } }),
      // Delete all progress records
      Progress.deleteMany({ userId: id }),
      // Delete all activity logs
      ActivityLog.deleteMany({ userId: id }),
    ]);

    // Finally, delete the user
    await User.findByIdAndDelete(id);

    return NextResponse.json({
      success: true,
      message: 'User and all related data deleted successfully',
      deletedData: {
        userId: id,
        videosDeleted: youtubeVideoIds.length,
      },
    });
  } catch (error) {
    console.error('Admin User Delete Error:', error);
    return NextResponse.json(
      { success: false, message: 'Server error' },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  return withAdminAuth(request, (req) => handleGET(req, context));
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  return withAdminAuth(request, (req) => handleDELETE(req, context));
}
