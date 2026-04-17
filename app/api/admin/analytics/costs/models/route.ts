import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import Cost from '@/lib/models/Cost';
import { parseDateRange } from '@/lib/cost/date-range';

/**
 * GET /api/admin/analytics/costs/models?days=30
 *
 * Returns model usage comparison with efficiency metrics
 */
export async function GET(request: NextRequest) {
  try {
    requireAdmin(request);

    await dbConnect();

    const { startDate, endDate, days } = parseDateRange(request.nextUrl.searchParams);
    const dateMatch = { createdAt: { $gte: startDate, $lt: endDate } };

    const modelStats = await Cost.aggregate([
      { $match: dateMatch },
      { $unwind: '$services' },
      {
        $match: {
          'services.usage.unitDetails.metadata.model': { $exists: true }
        }
      },
      {
        $group: {
          _id: '$services.usage.unitDetails.metadata.model',
          totalCost: { $sum: '$services.usage.cost' },
          inputTokens: { $sum: '$services.usage.unitDetails.inputTokens' },
          outputTokens: { $sum: '$services.usage.unitDetails.outputTokens' },
          totalTokens: { $sum: '$services.usage.unitDetails.totalTokens' },
        }
      },
      { $sort: { totalCost: -1 } }
    ]);

    const models = modelStats.map(model => ({
      model: model._id,
      totalCost: parseFloat(model.totalCost.toFixed(6)),
      inputTokens: model.inputTokens || 0,
      outputTokens: model.outputTokens || 0,
      totalTokens: model.totalTokens || 0,
      costPerToken: model.totalTokens > 0
        ? parseFloat((model.totalCost / model.totalTokens).toFixed(10))
        : 0,
    }));

    return NextResponse.json({
      success: true,
      models,
      periodStart: startDate.toISOString(),
      periodEnd: endDate.toISOString(),
      days,
    });

  } catch (error) {
    console.error('Cost models error:', error);
    return NextResponse.json(
      { success: false, message: 'Server error' },
      { status: 500 }
    );
  }
}
