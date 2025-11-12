import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import ActivityLog from '@/lib/models/ActivityLog';
import { withAdminAuth } from '@/lib/admin-middleware';

async function handleGET(request: NextRequest) {
  try {
    await dbConnect();

    const { searchParams } = new URL(request.url);
    const range = searchParams.get('range') || 'month'; // 'month', 'year'

    // Calculate date range
    const now = new Date();
    let startDate: Date;

    switch (range) {
      case 'year':
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
      default:
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
    }

    // Get activity logs grouped by date
    const activities = await ActivityLog.aggregate([
      {
        $match: {
          timestamp: { $gte: startDate },
        },
      },
      {
        $group: {
          _id: {
            date: {
              $dateToString: {
                format: '%Y-%m-%d',
                date: '$timestamp',
              },
            },
            type: '$activityType',
          },
          count: { $sum: 1 },
        },
      },
      {
        $group: {
          _id: '$_id.date',
          activities: {
            $push: {
              type: '$_id.type',
              count: '$count',
            },
          },
          totalCount: { $sum: '$count' },
        },
      },
      {
        $sort: { _id: 1 },
      },
    ]);

    // Format data for heatmap
    const data = activities.map((item) => ({
      date: item._id,
      total: item.totalCount,
      byType: item.activities.reduce((acc: Record<string, number>, activity: { type: string; count: number }) => {
        acc[activity.type] = activity.count;
        return acc;
      }, {}),
    }));

    // Get activity type breakdown
    const typeBreakdown = await ActivityLog.aggregate([
      {
        $match: {
          timestamp: { $gte: startDate },
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

    return NextResponse.json({
      success: true,
      data: {
        range,
        startDate,
        endDate: now,
        heatmap: data,
        totalActivities: data.reduce((sum, item) => sum + item.total, 0),
        typeBreakdown: typeBreakdown.map((item) => ({
          type: item._id,
          count: item.count,
        })),
      },
    });
  } catch (error) {
    console.error('Admin Activity Analytics Error:', error);
    return NextResponse.json(
      { success: false, message: 'Server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  return withAdminAuth(request, handleGET);
}
