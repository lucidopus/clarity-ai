import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import Cost from '@/lib/models/Cost';
import { parseDateRange } from '@/lib/cost/date-range';

/**
 * GET /api/admin/analytics/costs/heatmap?days=30
 *
 * Returns daily spending heatmap data
 */
export async function GET(request: NextRequest) {
  try {
    requireAdmin(request);

    await dbConnect();

    const { startDate, endDate, days } = parseDateRange(request.nextUrl.searchParams);

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
          dailyTotalCost: { $sum: '$totalCost' }
        }
      },
      { $sort: { '_id': 1 } }
    ]);

    // Calculate min/max for color scale
    const costs = aggregations.map((a: { dailyTotalCost: number }) => a.dailyTotalCost);
    const minCost = costs.length > 0 ? Math.min(...costs) : 0;
    const maxCost = costs.length > 0 ? Math.max(...costs) : 0;

    // Format heatmap data
    const heatmap = aggregations.map((agg: { _id: string; dailyTotalCost: number }) => {
      const date = new Date(agg._id + 'T00:00:00Z');
      return {
        date: agg._id, // YYYY-MM-DD
        dayOfWeek: date.getDay(), // 0 = Sunday, 6 = Saturday
        cost: parseFloat(agg.dailyTotalCost.toFixed(6)),
        // Normalize cost to 0-1 scale for color intensity
        intensity: maxCost > 0
          ? (agg.dailyTotalCost - minCost) / (maxCost - minCost)
          : 0,
      };
    });

    // Calculate trend indicator
    let trendIndicator = 'stable';
    if (aggregations.length >= 7) {
      const recentWeek = aggregations.slice(-7);
      const previousWeek = aggregations.slice(-14, -7);

      if (previousWeek.length >= 7) {
        const recentAvg = recentWeek.reduce((sum: number, a: { dailyTotalCost: number }) => sum + a.dailyTotalCost, 0) / 7;
        const previousAvg = previousWeek.reduce((sum: number, a: { dailyTotalCost: number }) => sum + a.dailyTotalCost, 0) / 7;

        if (recentAvg > previousAvg * 1.1) {
          trendIndicator = 'up';
        } else if (recentAvg < previousAvg * 0.9) {
          trendIndicator = 'down';
        }
      }
    }

    return NextResponse.json({
      success: true,
      heatmap,
      stats: {
        minCost: parseFloat(minCost.toFixed(6)),
        maxCost: parseFloat(maxCost.toFixed(6)),
        avgCost: aggregations.length > 0
          ? parseFloat((costs.reduce((a: number, b: number) => a + b, 0) / costs.length).toFixed(6))
          : 0,
        trendIndicator,
      },
      periodStart: startDate.toISOString(),
      periodEnd: endDate.toISOString(),
      days,
    });

  } catch (error) {
    console.error('Cost heatmap error:', error);
    return NextResponse.json(
      { success: false, message: 'Server error' },
      { status: 500 }
    );
  }
}
