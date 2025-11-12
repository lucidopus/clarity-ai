import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminToken } from '@/lib/adminAuth';
import dbConnect from '@/lib/mongodb';
import User from '@/lib/models/User';

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
    const view = searchParams.get('view') || 'week'; // week, month, or year

    let groupBy: Record<string, unknown>;
    let dateRange: Date;
    const now = new Date();

    switch (view) {
      case 'week':
        // Last 7 days, group by day
        dateRange = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        groupBy = {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' },
          day: { $dayOfMonth: '$createdAt' },
        };
        break;

      case 'month':
        // Last 30 days, group by day
        dateRange = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        groupBy = {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' },
          day: { $dayOfMonth: '$createdAt' },
        };
        break;

      case 'year':
        // Last 12 months, group by month
        dateRange = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        groupBy = {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' },
        };
        break;

      default:
        return NextResponse.json(
          {
            success: false,
            message: 'Invalid view parameter. Must be: week, month, or year',
          },
          { status: 400 }
        );
    }

    // Aggregate registrations
    const registrations = await User.aggregate([
      {
        $match: {
          createdAt: { $gte: dateRange },
        },
      },
      {
        $group: {
          _id: groupBy,
          count: { $sum: 1 },
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
    const formattedData = registrations.map((item) => {
      const { _id, count } = item;

      if (view === 'year') {
        // Format as "YYYY-MM"
        const month = String(_id.month).padStart(2, '0');
        return {
          date: `${_id.year}-${month}`,
          year: _id.year,
          month: _id.month,
          count,
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
        };
      }
    });

    return NextResponse.json({
      success: true,
      view,
      dateRange: {
        start: dateRange.toISOString(),
        end: now.toISOString(),
      },
      data: formattedData,
    });
  } catch (error) {
    console.error('Admin registrations analytics error:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Server error',
      },
      { status: 500 }
    );
  }
}
