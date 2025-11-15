import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminToken } from '@/lib/adminAuth';
import dbConnect from '@/lib/mongodb';
import Cost from '@/lib/models/Cost';

/**
 * GET /api/admin/analytics/costs/by-source
 *
 * Returns cost breakdown by feature source
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

    // Get total cost for percentage calculation
    const totalCostResult = await Cost.aggregate([
      {
        $group: {
          _id: null,
          totalCost: { $sum: '$totalCost' },
        }
      }
    ]);

    const totalCost = totalCostResult.length > 0 ? totalCostResult[0].totalCost : 0;

    // Aggregate by source
    const sourceStats = await Cost.aggregate([
      {
        $group: {
          _id: '$source',
          cost: { $sum: '$totalCost' },
          operations: { $sum: 1 },
        }
      },
      { $sort: { cost: -1 } }
    ]);

    // Format source data
    const sources = sourceStats.map(source => ({
      source: source._id,
      cost: parseFloat(source.cost.toFixed(6)),
      operations: source.operations,
      percentage: totalCost > 0
        ? parseFloat(((source.cost / totalCost) * 100).toFixed(2))
        : 0,
    }));

    return NextResponse.json({
      success: true,
      sources,
      totalCost: parseFloat(totalCost.toFixed(6)),
    });

  } catch (error) {
    console.error('Cost by-source error:', error);
    return NextResponse.json(
      { success: false, message: 'Server error' },
      { status: 500 }
    );
  }
}
