import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminToken } from '@/lib/adminAuth';
import dbConnect from '@/lib/mongodb';
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
    const view = searchParams.get('view') || 'month'; // month or year

    let groupBy: Record<string, unknown>;
    let dateRange: Date;
    const now = new Date();

    switch (view) {
      case 'month':
        // Last 30 days, group by day
        dateRange = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        groupBy = {
          year: { $year: '$timestamp' },
          month: { $month: '$timestamp' },
          day: { $dayOfMonth: '$timestamp' },
        };
        break;

      case 'year':
        // Last 12 months, group by month
        dateRange = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        groupBy = {
          year: { $year: '$timestamp' },
          month: { $month: '$timestamp' },
        };
        break;

      default:
        return NextResponse.json(
          {
            success: false,
            message: 'Invalid view parameter. Must be: month or year',
          },
          { status: 400 }
        );
    }

    // Aggregate activity data
    const activities = await ActivityLog.aggregate([
      {
        $match: {
          timestamp: { $gte: dateRange },
        },
      },
      {
        $group: {
          _id: groupBy,
          count: { $sum: 1 },
          uniqueUsers: { $addToSet: '$userId' },
          activityTypes: { $addToSet: '$activityType' },
        },
      },
      {
        $project: {
          _id: 1,
          count: 1,
          uniqueUserCount: { $size: '$uniqueUsers' },
          activityTypes: 1,
        },
      },
      {
        $sort: {
          '_id.year': 1,
          '_id.month': 1,
          '_id.day': 1,
        },
      },
    ]);

    // Format the data based on view
    const formattedData = activities.map((item) => {
      const { _id, count, uniqueUserCount, activityTypes } = item;

      if (view === 'year') {
        // Format as "YYYY-MM"
        const month = String(_id.month).padStart(2, '0');
        return {
          date: `${_id.year}-${month}`,
          year: _id.year,
          month: _id.month,
          count,
          uniqueUsers: uniqueUserCount,
          activityTypes,
        };
      } else {
        // Format as "YYYY-MM-DD"
        const month = String(_id.month).padStart(2, '0');
        const day = String(_id.day).padStart(2, '0');
        return {
          date: `${_id.year}-${month}-${day}`,
          year: _id.year,
          month: _id.month,
          day: _id.day,
          count,
          uniqueUsers: uniqueUserCount,
          activityTypes,
        };
      }
    });

    // Get activity type breakdown
    const activityBreakdown = await ActivityLog.aggregate([
      {
        $match: {
          timestamp: { $gte: dateRange },
        },
      },
      {
        $group: {
          _id: '$activityType',
          count: { $sum: 1 },
        },
      },
      {
        $sort: { count: -1 },
      },
    ]);

    const activityStats = activityBreakdown.reduce(
      (acc: Record<string, number>, item: { _id: string; count: number }) => {
        acc[item._id] = item.count;
        return acc;
      },
      {}
    );

    return NextResponse.json({
      success: true,
      view,
      dateRange: {
        start: dateRange.toISOString(),
        end: now.toISOString(),
      },
      data: formattedData,
      breakdown: activityStats,
    });
  } catch (error) {
    console.error('Admin activity heatmap error:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Server error',
      },
      { status: 500 }
    );
  }
}
