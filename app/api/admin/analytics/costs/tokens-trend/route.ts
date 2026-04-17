import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import Cost from '@/lib/models/Cost';
import { parseDateRange } from '@/lib/cost/date-range';

/**
 * GET /api/admin/analytics/costs/tokens-trend?days=30
 *
 * Returns daily token consumption trend
 */
export async function GET(request: NextRequest) {
  try {
    requireAdmin(request);

    await dbConnect();

    const { startDate, endDate, days } = parseDateRange(request.nextUrl.searchParams);

    // Aggregate data from costs collection by day.
    // We $unwind services so token counts from every entry (Apify + validation + LLM)
    // contribute, not just the first. Cost is summed separately per-record to avoid
    // double-counting after the unwind.
    const costPerDay = await Cost.aggregate([
      { $match: { createdAt: { $gte: startDate, $lt: endDate } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          dailyTotalCost: { $sum: '$totalCost' },
        },
      },
    ]);

    const tokensPerDay = await Cost.aggregate([
      { $match: { createdAt: { $gte: startDate, $lt: endDate } } },
      { $unwind: '$services' },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          dailyInputTokens: {
            $sum: { $ifNull: ['$services.usage.unitDetails.inputTokens', 0] },
          },
          dailyOutputTokens: {
            $sum: { $ifNull: ['$services.usage.unitDetails.outputTokens', 0] },
          },
        },
      },
    ]);

    const tokensMap = new Map<string, { dailyInputTokens: number; dailyOutputTokens: number }>(
      tokensPerDay.map((t: { _id: string; dailyInputTokens: number; dailyOutputTokens: number }) => [
        t._id,
        { dailyInputTokens: t.dailyInputTokens || 0, dailyOutputTokens: t.dailyOutputTokens || 0 },
      ])
    );

    const aggregations = costPerDay
      .map((c: { _id: string; dailyTotalCost: number }) => ({
        _id: c._id,
        dailyTotalCost: c.dailyTotalCost,
        dailyInputTokens: tokensMap.get(c._id)?.dailyInputTokens ?? 0,
        dailyOutputTokens: tokensMap.get(c._id)?.dailyOutputTokens ?? 0,
      }))
      .sort((a, b) => a._id.localeCompare(b._id));

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
      days,
    });

  } catch (error) {
    console.error('Tokens trend error:', error);
    return NextResponse.json(
      { success: false, message: 'Server error' },
      { status: 500 }
    );
  }
}
