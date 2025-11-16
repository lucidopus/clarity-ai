import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminToken } from '@/lib/adminAuth';
import dbConnect from '@/lib/mongodb';
import Cost from '@/lib/models/Cost';
import User from '@/lib/models/User';

/**
 * GET /api/admin/analytics/costs/users?limit=10
 *
 * Returns top users sorted by cost
 */
export async function GET(request: NextRequest) {
  try {
    // Verify admin authentication
    const isAdmin = await verifyAdminToken(request);

    if (!isAdmin) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    await dbConnect();

    // Parse query params
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '10', 10);

    // Aggregate costs by user
    const userCosts = await Cost.aggregate([
      {
        $group: {
          _id: '$userId',
          totalCost: { $sum: '$totalCost' },
        }
      },
      { $sort: { totalCost: -1 } },
      { $limit: limit }
    ]);

    // Get user details
    const userIds = userCosts.map(uc => uc._id);
    const users = await User.find({ _id: { $in: userIds } })
      .select('_id firstName lastName email')
      .lean();

    // Create user map for quick lookup
    interface UserData {
      _id: { toString: () => string };
      firstName: string;
      lastName: string;
      email: string;
    }
    const userMap = new Map(users.map((u) => {
      const userData = u as unknown as UserData;
      return [userData._id.toString(), userData];
    }));

    // Combine cost data with user details
    const topUsers = userCosts.map(uc => {
      const user = userMap.get(uc._id.toString());
      return {
        userId: uc._id,
        userName: user ? `${user.firstName} ${user.lastName}` : 'Unknown',
        email: user?.email || 'N/A',
        totalCost: parseFloat(uc.totalCost.toFixed(6)),
      };
    });

    return NextResponse.json({
      success: true,
      users: topUsers,
    });

  } catch (error) {
    console.error('Cost users error:', error);
    return NextResponse.json(
      { success: false, message: 'Server error' },
      { status: 500 }
    );
  }
}
