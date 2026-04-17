import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import Cost from '@/lib/models/Cost';
import { parseDateRange } from '@/lib/cost/date-range';

/**
 * GET /api/admin/analytics/costs/services?days=30
 *
 * Returns service efficiency comparison
 */
export async function GET(request: NextRequest) {
  try {
    requireAdmin(request);

    await dbConnect();

    const { startDate, endDate, days } = parseDateRange(request.nextUrl.searchParams);
    const dateMatch = { createdAt: { $gte: startDate, $lt: endDate } };

    const serviceStats = await Cost.aggregate([
      { $match: dateMatch },
      { $unwind: '$services' },
      {
        $group: {
          _id: '$services.service',
          totalCost: { $sum: '$services.usage.cost' },
          successCount: {
            $sum: {
              $cond: [{ $eq: ['$services.status', 'success'] }, 1, 0]
            }
          },
          wastedCost: {
            $sum: {
              $cond: [{ $eq: ['$services.status', 'failed'] }, '$services.usage.cost', 0]
            }
          },
          totalCount: { $sum: 1 },
        }
      },
      { $sort: { totalCost: -1 } }
    ]);

    // successRate = % of service invocations that returned status='success'.
    // wastedCost surfaces per-service COGS that produced nothing, so the UI
    // can flag specific providers instead of only showing the global total.
    const services = serviceStats.map(service => {
      const successRate = service.totalCount > 0
        ? (service.successCount / service.totalCount) * 100
        : 0;

      return {
        service: service._id,
        totalCost: parseFloat(service.totalCost.toFixed(6)),
        wastedCost: parseFloat((service.wastedCost || 0).toFixed(6)),
        successRate: parseFloat(successRate.toFixed(2)),
        operations: service.totalCount,
      };
    });

    // Sort by reliability (highest success rate first, break ties by lowest spend)
    services.sort((a, b) => {
      if (Math.abs(a.successRate - b.successRate) > 5) {
        return b.successRate - a.successRate;
      }
      return a.totalCost - b.totalCost;
    });

    return NextResponse.json({
      success: true,
      services,
      periodStart: startDate.toISOString(),
      periodEnd: endDate.toISOString(),
      days,
    });

  } catch (error) {
    console.error('Cost services error:', error);
    return NextResponse.json(
      { success: false, message: 'Server error' },
      { status: 500 }
    );
  }
}
