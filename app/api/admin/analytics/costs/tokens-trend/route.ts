import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminToken } from '@/lib/adminAuth';
import dbConnect from '@/lib/mongodb';
import CostAggregation from '@/lib/models/CostAggregation';
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
    const endDate = startOfDay(new Date());
    const startDate = startOfDay(subDays(endDate, days));

    // Get aggregations for the date range
    const aggregations = await CostAggregation.find({
      date: { $gte: startDate, $lt: endDate }
    })
      .select('date dailyTotalCost dailyInputTokens dailyOutputTokens dailyTotalTokens movingAverage7d stdDev7d')
      .sort({ date: 1 })
      .lean();

    // Format trend data
    const trends = aggregations.map(agg => ({
      date: agg.date.toISOString().split('T')[0], // YYYY-MM-DD
      cost: parseFloat(agg.dailyTotalCost.toFixed(6)),
      inputTokens: agg.dailyInputTokens,
      outputTokens: agg.dailyOutputTokens,
      totalTokens: agg.dailyTotalTokens,
      movingAverage7d: parseFloat(agg.movingAverage7d.toFixed(6)),
      isAnomaly: agg.movingAverage7d > 0 && agg.stdDev7d > 0
        ? agg.dailyTotalCost > (agg.movingAverage7d + (3 * agg.stdDev7d))
        : false,
    }));

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
