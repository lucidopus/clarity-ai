import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User from '@/lib/models/User';
import Video from '@/lib/models/Video';
import LearningMaterial from '@/lib/models/LearningMaterial';
import Flashcard from '@/lib/models/Flashcard';
import Quiz from '@/lib/models/Quiz';
import { withAdminAuth } from '@/lib/admin-middleware';

async function handleGET(request: NextRequest) {
  try {
    await dbConnect();

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const search = searchParams.get('search') || '';

    // Build search query
    const searchQuery = search
      ? {
          $or: [
            { firstName: { $regex: search, $options: 'i' } },
            { lastName: { $regex: search, $options: 'i' } },
            { email: { $regex: search, $options: 'i' } },
            { username: { $regex: search, $options: 'i' } },
          ],
        }
      : {};

    // Get total count
    const total = await User.countDocuments(searchQuery);

    // Get paginated users
    const users = await User.find(searchQuery)
      .select('_id username email firstName lastName createdAt lastLoginDate loginStreak longestStreak')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    // Get generation counts for each user
    const usersWithCounts = await Promise.all(
      users.map(async (user) => {
        const userId = user._id.toString();

        // Get all videos for this user
        const videos = await Video.find({ userId }).select('videoId').lean();
        const youtubeVideoIds = videos.map((v) => v.videoId); // YouTube IDs

        // Get counts from separate collections (use YouTube videoId)
        const [flashcardsCount, quizzesCount, materialsCount] = await Promise.all([
          youtubeVideoIds.length > 0 ? Flashcard.countDocuments({ videoId: { $in: youtubeVideoIds } }) : 0,
          youtubeVideoIds.length > 0 ? Quiz.countDocuments({ videoId: { $in: youtubeVideoIds } }) : 0,
          youtubeVideoIds.length > 0
            ? LearningMaterial.aggregate([
                { $match: { videoId: { $in: youtubeVideoIds } } },
                {
                  $group: {
                    _id: null,
                    totalPrerequisites: {
                      $sum: { $cond: [{ $isArray: '$prerequisites' }, { $size: '$prerequisites' }, 0] },
                    },
                    totalTimestamps: {
                      $sum: { $cond: [{ $isArray: '$timestamps' }, { $size: '$timestamps' }, 0] },
                    },
                  },
                },
              ])
            : [],
        ]);

        const materialAggregation = materialsCount[0] || {
          totalPrerequisites: 0,
          totalTimestamps: 0,
        };

        const counts = {
          totalFlashcards: flashcardsCount,
          totalQuizzes: quizzesCount,
          totalPrerequisites: materialAggregation.totalPrerequisites,
          totalTimestamps: materialAggregation.totalTimestamps,
        };

        return {
          id: userId,
          username: user.username,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          registrationDate: user.createdAt,
          lastLoginDate: user.lastLoginDate,
          loginStreak: user.loginStreak || 0,
          longestStreak: user.longestStreak || 0,
          videosProcessed: videos.length,
          generations: {
            flashcards: counts.totalFlashcards,
            quizzes: counts.totalQuizzes,
            prerequisites: counts.totalPrerequisites,
            timestamps: counts.totalTimestamps,
          },
        };
      })
    );

    return NextResponse.json({
      success: true,
      data: {
        users: usersWithCounts,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    console.error('Admin Users List Error:', error);
    return NextResponse.json(
      { success: false, message: 'Server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  return withAdminAuth(request, handleGET);
}
