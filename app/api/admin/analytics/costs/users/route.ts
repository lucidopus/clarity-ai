import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import Cost from '@/lib/models/Cost';
import User from '@/lib/models/User';
import { parseDateRange } from '@/lib/cost/date-range';

/**
 * GET /api/admin/analytics/costs/users?days=30&limit=10
 *
 * Returns top users by cost for the window, including operations count,
 * wasted spend, and the user's most recent cost-accruing activity.
 */
export async function GET(request: NextRequest) {
  try {
    requireAdmin(request);

    await dbConnect();

    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    const { startDate, endDate, days } = parseDateRange(searchParams);
    const dateMatch = { createdAt: { $gte: startDate, $lt: endDate } };

    // Single aggregation: compute wasted spend per-record via $reduce over
    // the services array so totalCost stays a root-level sum (no unwind
    // double-count), and wastedCost rolls up in the same $group pass.
    const userCosts = await Cost.aggregate([
      { $match: dateMatch },
      {
        $addFields: {
          wastedPerRecord: {
            $reduce: {
              input: { $ifNull: ['$services', []] },
              initialValue: 0,
              in: {
                $add: [
                  '$$value',
                  {
                    $cond: [
                      { $eq: ['$$this.status', 'failed'] },
                      { $ifNull: ['$$this.usage.cost', 0] },
                      0,
                    ],
                  },
                ],
              },
            },
          },
        },
      },
      {
        $group: {
          _id: '$userId',
          totalCost: { $sum: '$totalCost' },
          wastedCost: { $sum: '$wastedPerRecord' },
          operations: { $sum: 1 },
          lastActive: { $max: '$createdAt' },
        },
      },
      { $sort: { totalCost: -1 } },
      { $limit: limit },
    ]);

    const userIds = userCosts.map(uc => uc._id);
    const users = await User.find({ _id: { $in: userIds } })
      .select('_id firstName lastName email')
      .lean();

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

    const topUsers = userCosts.map(uc => {
      const user = userMap.get(uc._id.toString());
      return {
        userId: uc._id,
        userName: user ? `${user.firstName} ${user.lastName}` : 'Unknown',
        email: user?.email || 'N/A',
        totalCost: parseFloat(uc.totalCost.toFixed(6)),
        wastedCost: parseFloat((uc.wastedCost ?? 0).toFixed(6)),
        operations: uc.operations,
        lastActive: uc.lastActive instanceof Date ? uc.lastActive.toISOString() : uc.lastActive,
      };
    });

    return NextResponse.json({
      success: true,
      users: topUsers,
      periodStart: startDate.toISOString(),
      periodEnd: endDate.toISOString(),
      days,
    });

  } catch (error) {
    console.error('Cost users error:', error);
    return NextResponse.json(
      { success: false, message: 'Server error' },
      { status: 500 }
    );
  }
}
