import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminToken } from '@/lib/adminAuth';
import dbConnect from '@/lib/mongodb';
import Cost from '@/lib/models/Cost';
import { startOfDay, subDays } from 'date-fns';

/**
 * GET /api/admin/analytics/costs/tokens-trend?days=30
 *
 * Returns daily token consumption trend
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
    const days = parseInt(searchParams.get('days') || '30', 10);

    // Calculate date range
    const endDate = new Date(); // Include today's data up to now
    const startDate = startOfDay(subDays(new Date(), days));

    // Aggregate data from costs collection by day
    const aggregations = await Cost.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lt: endDate }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
          },
          dailyTotalCost: { $sum: '$totalCost' },
          dailyInputTokens: {
            $sum: {
              $sum: [
                { $arrayElemAt: ['$services.usage.unitDetails.inputTokens', 0] }
              ]
            }
          },
          dailyOutputTokens: {
            $sum: {
              $sum: [
                { $arrayElemAt: ['$services.usage.unitDetails.outputTokens', 0] }
              ]
            }
          }
        }
      },
      { $sort: { '_id': 1 } }
    ]);

    // Calculate 7-day moving average and format data
    const trends = aggregations.map((agg: { _id: string; dailyTotalCost: number; dailyInputTokens: number; dailyOutputTokens: number }, index: number) => {
      // Get previous 7 days for moving average
      const startIdx = Math.max(0, index - 6);
      const previousDays = aggregations.slice(startIdx, index + 1);
      const movingAvgCost = previousDays.reduce((sum: number, d: { dailyTotalCost: number }) => sum + d.dailyTotalCost, 0) / previousDays.length;

      // Calculate standard deviation
      const variance = previousDays.reduce((sum: number, d: { dailyTotalCost: number }) => sum + Math.pow(d.dailyTotalCost - movingAvgCost, 2), 0) / previousDays.length;
      const stdDev = Math.sqrt(variance);

      return {
        date: agg._id,
        cost: parseFloat(agg.dailyTotalCost.toFixed(6)),
        inputTokens: agg.dailyInputTokens || 0,
        outputTokens: agg.dailyOutputTokens || 0,
        totalTokens: (agg.dailyInputTokens || 0) + (agg.dailyOutputTokens || 0),
        movingAverage7d: parseFloat(movingAvgCost.toFixed(6)),
        isAnomaly: stdDev > 0 && agg.dailyTotalCost > (movingAvgCost + (3 * stdDev))
      };
    });

    return NextResponse.json({
      success: true,
      trends,
      periodStart: startDate.toISOString(),
      periodEnd: endDate.toISOString(),
    });

  } catch (error) {
    console.error('Tokens trend error:', error);
    return NextResponse.json(
      { success: false, message: 'Server error' },
      { status: 500 }
    );
  }
}
