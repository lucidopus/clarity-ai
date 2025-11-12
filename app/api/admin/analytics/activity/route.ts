import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import ActivityLog from '@/lib/models/ActivityLog';
import { withAdminAuth } from '@/lib/admin-middleware';

// Helper function to format date labels based on granularity
function formatDateLabel(dateStr: string, format: string): string {
  if (format === '%Y-%m') {
    // Month-level: convert "2025-01" to "Jan"
    const [year, month] = dateStr.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleString('en-US', { month: 'short' });
  } else {
    // Day-level: convert "2025-01-15" to "Jan 15"
    const [year, month, day] = dateStr.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    return date.toLocaleString('en-US', { month: 'short', day: 'numeric' });
  }
}

async function handleGET(request: NextRequest) {
  try {
    await dbConnect();

    const { searchParams } = new URL(request.url);
    const range = searchParams.get('range') || 'month'; // 'week', 'month', 'year'

    // Calculate date range and format
    const now = new Date();
    let startDate: Date;
    let format: string;

    switch (range) {
      case 'week':
        // Last 7 days, day-level granularity
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        format = '%Y-%m-%d';
        break;
      case 'year':
        // Full year, month-level granularity
        startDate = new Date(now.getFullYear(), 0, 1);
        format = '%Y-%m';
        break;
      case 'month':
      default:
        // Last 30 days, day-level granularity
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        format = '%Y-%m-%d';
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
                format: format,
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

    // Format data for heatmap with readable labels
    const data = activities.map((item) => ({
      date: formatDateLabel(item._id, format),
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
