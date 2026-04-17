import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import Cost from '@/lib/models/Cost';
import { parseDateRange } from '@/lib/cost/date-range';

/**
 * GET /api/admin/analytics/costs/by-source?days=30
 *
 * Returns cost breakdown by feature source
 */
export async function GET(request: NextRequest) {
  try {
    requireAdmin(request);

    await dbConnect();

    const { startDate, endDate, days } = parseDateRange(request.nextUrl.searchParams);
    const dateMatch = { createdAt: { $gte: startDate, $lt: endDate } };

    const totalCostResult = await Cost.aggregate([
      { $match: dateMatch },
      {
        $group: {
          _id: null,
          totalCost: { $sum: '$totalCost' },
        }
      }
    ]);

    const totalCost = totalCostResult.length > 0 ? totalCostResult[0].totalCost : 0;

    const sourceStats = await Cost.aggregate([
      { $match: dateMatch },
      {
        $group: {
          _id: '$source',
          cost: { $sum: '$totalCost' },
          operations: { $sum: 1 },
        }
      },
      { $sort: { cost: -1 } }
    ]);

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
      periodStart: startDate.toISOString(),
      periodEnd: endDate.toISOString(),
      days,
    });

  } catch (error) {
    console.error('Cost by-source error:', error);
    return NextResponse.json(
      { success: false, message: 'Server error' },
      { status: 500 }
    );
  }
}
