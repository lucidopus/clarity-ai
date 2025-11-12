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

    switch (range) {
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'year':
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
      default:
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
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
              format: range === 'week' ? '%Y-%m-%d' : range === 'year' ? '%Y-%m' : '%Y-%m-%d',
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

    // Format data for chart
    const data = registrations.map((item) => ({
      date: item._id,
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
