import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { requireAdmin } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import User from '@/lib/models/User';
import Video from '@/lib/models/Video';
import Flashcard from '@/lib/models/Flashcard';
import Quiz from '@/lib/models/Quiz';
import ActivityLog from '@/lib/models/ActivityLog';
import Cost from '@/lib/models/Cost';
import { escapeRegex } from '@/lib/utils/escape-regex';

export async function GET(request: NextRequest) {
  try {
    requireAdmin(request);

    await dbConnect();

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get('search') || '';
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 100);
    const sortBy = searchParams.get('sortBy') || 'joined';
    const sortOrder = searchParams.get('sortOrder') || 'desc';
    const joinDateAfter = searchParams.get('joinDateAfter');
    const joinDateBefore = searchParams.get('joinDateBefore');

    // Build search query
    interface SearchQuery {
      $or?: Array<Record<string, { $regex: string; $options: string }>>;
      createdAt?: Record<string, Date>;
    }

    const searchQuery: SearchQuery = {};

    if (search) {
      const escapedSearch = escapeRegex(search);
      searchQuery.$or = [
        { firstName: { $regex: escapedSearch, $options: 'i' } },
        { lastName: { $regex: escapedSearch, $options: 'i' } },
        { username: { $regex: escapedSearch, $options: 'i' } },
        { email: { $regex: escapedSearch, $options: 'i' } },
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

    interface UserData {
      _id: mongoose.Types.ObjectId;
      username: string;
      email: string;
      firstName: string;
      lastName: string;
      createdAt: Date;
      lastLoginDate?: Date;
      loginStreak?: number;
    }

    interface UserWithVideoCount extends UserData {
      videoCount: number;
    }

    let users: Array<UserData | UserWithVideoCount>;

    if (sortBy === 'videos') {
      // Server-side sort by video count using aggregation pipeline (no in-memory loading)
      const order = sortOrder === 'asc' ? 1 : -1;
      const pipeline = [
        { $match: searchQuery },
        { $project: { _id: 1, username: 1, email: 1, firstName: 1, lastName: 1, createdAt: 1, lastLoginDate: 1, loginStreak: 1 } },
        { $lookup: { from: 'videos', localField: '_id', foreignField: 'userId', as: '_vids', pipeline: [{ $project: { _id: 1 } }] } },
        { $addFields: { videoCount: { $size: '$_vids' } } },
        { $project: { _vids: 0 } },
        { $sort: { videoCount: order as 1 | -1 } },
        { $skip: (page - 1) * limit },
        { $limit: limit },
      ];
      users = (await User.aggregate(pipeline)) as UserWithVideoCount[];
    } else {
      // Build sort object for other sorts
      const order = sortOrder === 'asc' ? 1 : -1;
      let sortObj: Record<string, number>;

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
      users = (await User.find(searchQuery)
        .select('_id username email firstName lastName createdAt lastLoginDate loginStreak')
        .sort(sortObj as unknown as Record<string, 1 | -1>)
        .skip((page - 1) * limit)
        .limit(limit)
        .lean()) as unknown as UserData[];
    }

    // Batch-fetch all counts for paginated users in parallel aggregations (2 queries total instead of 4×N)
    const pageUserIds = users.map((u) => new mongoose.Types.ObjectId(u._id));

    const [videosBatch, flashcardsBatch, quizzesBatch, activitiesBatch, costsBatch] = await Promise.all([
      // Skip video batch when sortBy==='videos' — counts are already in user objects
      sortBy === 'videos'
        ? Promise.resolve([] as { _id: mongoose.Types.ObjectId; count: number }[])
        : Video.aggregate([
            { $match: { userId: { $in: pageUserIds } } },
            { $group: { _id: '$userId', count: { $sum: 1 } } },
          ]),
      Flashcard.aggregate([
        { $match: { userId: { $in: pageUserIds } } },
        { $group: { _id: '$userId', count: { $sum: 1 } } },
      ]),
      Quiz.aggregate([
        { $match: { userId: { $in: pageUserIds } } },
        { $group: { _id: '$userId', count: { $sum: 1 } } },
      ]),
      ActivityLog.aggregate([
        { $match: { userId: { $in: pageUserIds } } },
        { $group: { _id: '$userId', count: { $sum: 1 } } },
      ]),
      Cost.aggregate([
        { $match: { userId: { $in: pageUserIds } } },
        { $group: { _id: '$userId', totalCost: { $sum: '$totalCost' }, operations: { $sum: 1 } } },
      ]),
    ]);

    type CountRow = { _id: mongoose.Types.ObjectId; count: number };
    type CostRow = { _id: mongoose.Types.ObjectId; totalCost: number; operations: number };

    const videosMap    = new Map((videosBatch    as CountRow[]).map((r) => [r._id.toString(), r.count]));
    const flashcardsMap = new Map((flashcardsBatch as CountRow[]).map((r) => [r._id.toString(), r.count]));
    const quizzesMap   = new Map((quizzesBatch   as CountRow[]).map((r) => [r._id.toString(), r.count]));
    const activitiesMap = new Map((activitiesBatch as CountRow[]).map((r) => [r._id.toString(), r.count]));
    const costsMap     = new Map((costsBatch     as CostRow[]).map((r) => [r._id.toString(), r]));

    const usersWithCounts = users.map((user) => {
      const uid = user._id.toString();
      const videoCount = sortBy === 'videos' && 'videoCount' in user
        ? (user as UserWithVideoCount).videoCount
        : (videosMap.get(uid) ?? 0);
      const costRow = costsMap.get(uid);
      return {
        id: uid,
        username: user.username,
        email: user.email,
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        createdAt: user.createdAt,
        lastLoginDate: user.lastLoginDate || null,
        loginStreak: user.loginStreak || 0,
        stats: {
          videos: videoCount,
          flashcards: flashcardsMap.get(uid) ?? 0,
          quizzes: quizzesMap.get(uid) ?? 0,
          activities: activitiesMap.get(uid) ?? 0,
        },
        cost: costRow
          ? { totalCost: parseFloat(costRow.totalCost.toFixed(6)), operations: costRow.operations }
          : null,
      };
    });

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
