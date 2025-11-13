import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
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

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get('search') || '';
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const sortBy = searchParams.get('sortBy') || 'joined';
    const sortOrder = searchParams.get('sortOrder') || 'desc';
    const joinDateAfter = searchParams.get('joinDateAfter');
    const joinDateBefore = searchParams.get('joinDateBefore');

    // Build search query
    const searchQuery: {
      $or?: Array<Record<string, any>>;
      createdAt?: Record<string, Date>;
    } = {};

    if (search) {
      searchQuery.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { username: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    // Add date filters
    if (joinDateAfter || joinDateBefore) {
      searchQuery.createdAt = {};
      if (joinDateAfter) {
        searchQuery.createdAt!.$gte = new Date(joinDateAfter);
      }
      if (joinDateBefore) {
        searchQuery.createdAt!.$lte = new Date(joinDateBefore);
      }
    }

    // Get total count
    const totalUsers = await User.countDocuments(searchQuery);

    let users: Record<string, any>[];

    if (sortBy === 'videos') {
      // For video sorting, we need to get all users and sort by video count
      const allUsers = await User.find(searchQuery)
        .select('_id username email firstName lastName createdAt lastLoginDate loginStreak')
        .lean();

      // Get video counts for all users
      const usersWithVideoCounts = await Promise.all(
        allUsers.map(async (user: Record<string, any>) => {
          const userObjectId = new mongoose.Types.ObjectId(user._id);
          const videoCount = await Video.countDocuments({ userId: userObjectId });
          return { ...user, videoCount };
        })
      );

      // Sort by video count
      usersWithVideoCounts.sort((a, b) => {
        const order = sortOrder === 'asc' ? 1 : -1;
        return (a.videoCount - b.videoCount) * order;
      });

      // Apply pagination
      users = usersWithVideoCounts.slice((page - 1) * limit, page * limit);
    } else {
      // Build sort object for other sorts
      const order = sortOrder === 'asc' ? 1 : -1;
      let sortObj: any;

      switch (sortBy) {
        case 'name':
          sortObj = { firstName: order, lastName: order };
          break;
        case 'joined':
        default:
          sortObj = { createdAt: order };
          break;
      }

      // Get paginated users
      users = await User.find(searchQuery)
        .select('_id username email firstName lastName createdAt lastLoginDate loginStreak')
        .sort(sortObj)
        .skip((page - 1) * limit)
        .limit(limit)
        .lean();
    }

    // Get generation counts for each user
    const usersWithCounts = await Promise.all(
      users.map(async (user: Record<string, any>) => {
        // Convert userId to ObjectId for proper comparison
        const userObjectId = new mongoose.Types.ObjectId(user._id);

        // For video sort, videoCount is already calculated
        const videoCount = sortBy === 'videos' ? user.videoCount : await Video.countDocuments({ userId: userObjectId });

        const [flashcardCount, quizCount, activityCount] = await Promise.all([
          Flashcard.countDocuments({ userId: userObjectId }),
          Quiz.countDocuments({ userId: userObjectId }),
          ActivityLog.countDocuments({ userId: userObjectId }),
        ]);

        return {
          id: String(user._id),
          username: user.username,
          email: user.email,
          firstName: user.firstName || '',
          lastName: user.lastName || '',
          createdAt: user.createdAt,
          lastLoginDate: user.lastLoginDate || null,
          loginStreak: user.loginStreak || 0,
          stats: {
            videos: videoCount,
            flashcards: flashcardCount,
            quizzes: quizCount,
            activities: activityCount,
          },
        };
      })
    );

    return NextResponse.json({
      success: true,
      users: usersWithCounts,
      pagination: {
        page,
        limit,
        totalUsers,
        totalPages: Math.ceil(totalUsers / limit),
      },
    });
  } catch (error) {
    console.error('Admin users list error:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Server error',
      },
      { status: 500 }
    );
  }
}
