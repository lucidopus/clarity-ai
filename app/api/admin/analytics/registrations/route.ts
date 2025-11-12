import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User from '@/lib/models/User';
import { withAdminAuth } from '@/lib/admin-middleware';

async function handleGET(request: NextRequest) {
  try {
    await dbConnect();

    const { searchParams } = new URL(request.url);
    const range = searchParams.get('range') || 'month'; // 'week', 'month', 'year'

    // Calculate date range
    const now = new Date();
    let startDate: Date;
    let format: string;

    switch (range) {
      case 'week':
        // Last 7 days
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        format = '%Y-%m-%d'; // Day-level data
        break;
      case 'year':
        // Last 12 months
        startDate = new Date(now.getFullYear(), 0, 1); // Start of current year
        format = '%Y-%m'; // Month-level data
        break;
      case 'month':
      default:
        // Last 30 days
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        format = '%Y-%m-%d'; // Day-level data
        break;
    }

    // Get users grouped by registration date
    const registrations = await User.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: {
              format,
              date: '$createdAt',
            },
          },
          count: { $sum: 1 },
        },
      },
      {
        $sort: { _id: 1 },
      },
    ]);

    // Format date labels for frontend
    const formatDateLabel = (dateStr: string) => {
      if (range === 'year') {
        // Convert "2025-01" to "Jan"
        const [, month] = dateStr.split('-');
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        return monthNames[parseInt(month, 10) - 1];
      } else if (range === 'week') {
        // Convert "2025-01-15" to "Wed 15" or just "15"
        const date = new Date(dateStr + 'T00:00:00');
        return date.getDate().toString();
      } else {
        // Month view: show day number
        const date = new Date(dateStr + 'T00:00:00');
        return date.getDate().toString();
      }
    };

    // Format data for chart
    const data = registrations.map((item) => ({
      date: formatDateLabel(item._id),
      count: item.count,
    }));

    return NextResponse.json({
      success: true,
      data: {
        range,
        startDate,
        endDate: now,
        registrations: data,
        total: data.reduce((sum, item) => sum + item.count, 0),
      },
    });
  } catch (error) {
    console.error('Admin Registrations Analytics Error:', error);
    return NextResponse.json(
      { success: false, message: 'Server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  return withAdminAuth(request, handleGET);
}
