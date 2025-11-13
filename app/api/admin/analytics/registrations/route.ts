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
    const view = searchParams.get('view') || 'month'; // week or month

    const now = new Date();

    if (view === 'week') {
      // Last 7 days, group by weekday
      const dateRange = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      const registrations = await User.aggregate([
        {
          $match: {
            createdAt: { $gte: dateRange },
          },
        },
        {
          $group: {
            _id: { $dayOfWeek: '$createdAt' }, // 1 = Sunday, 7 = Saturday
            count: { $sum: 1 },
          },
        },
        {
          $sort: { '_id': 1 },
        },
      ]);

      // Map to weekday names
      const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const formattedData = dayNames.map((name, index) => {
        const dayOfWeek = index + 1; // MongoDB uses 1-based indexing (1 = Sunday)
        const found = registrations.find((r) => r._id === dayOfWeek);
        return {
          label: name,
          count: found ? found.count : 0,
        };
      });

      return NextResponse.json({
        success: true,
        view: 'week',
        data: formattedData,
      });
    } else if (view === 'month') {
      // Current month, group by day
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      const daysInMonth = endOfMonth.getDate();

      const registrations = await User.aggregate([
        {
          $match: {
            createdAt: { $gte: startOfMonth, $lte: endOfMonth },
          },
        },
        {
          $group: {
            _id: { $dayOfMonth: '$createdAt' },
            count: { $sum: 1 },
          },
        },
        {
          $sort: { '_id': 1 },
        },
      ]);

      // Create array for all days in month
      const formattedData = Array.from({ length: daysInMonth }, (_, i) => {
        const day = i + 1;
        const found = registrations.find((r) => r._id === day);
        return {
          label: String(day),
          count: found ? found.count : 0,
        };
      });

      return NextResponse.json({
        success: true,
        view: 'month',
        data: formattedData,
      });
    } else {
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid view parameter. Must be: week or month',
        },
        { status: 400 }
      );
    }
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
