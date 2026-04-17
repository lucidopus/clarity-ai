import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import Cost from '@/lib/models/Cost';
import User from '@/lib/models/User';
import { parseDateRange } from '@/lib/cost/date-range';

/**
 * GET /api/admin/analytics/costs/summary?days=30
 *
 * Returns spend split (success/wasted/rejected), per-service status breakdown,
 * active user count, and projected monthly burn for the selected window.
 */
export async function GET(request: NextRequest) {
  try {
    requireAdmin(request);

    await dbConnect();

    const { startDate, endDate, days } = parseDateRange(request.nextUrl.searchParams);
    const dateMatch = { createdAt: { $gte: startDate, $lt: endDate } };

    // Spend split by service status (success / failed / rejected).
    //   - successCost:  provider billed us + our pipeline succeeded
    //   - wastedCost:   provider billed us + our pipeline failed downstream
    //                   (this is COGS that produced nothing — the thing to
    //                   watch)
    //   - rejectedCost: content validation etc. — usually $0, surfaced for
    //                   visibility if any provider-billed cost slips through
    const spendSplitResult = await Cost.aggregate([
      { $match: dateMatch },
      { $unwind: '$services' },
      {
        $group: {
          _id: '$services.status',
          cost: { $sum: '$services.usage.cost' },
        },
      },
    ]);

    const splitMap = new Map<string, number>(
      spendSplitResult.map((r: { _id: string; cost: number }) => [r._id, r.cost])
    );
    const successCost = splitMap.get('success') ?? 0;
    const wastedCost = splitMap.get('failed') ?? 0;
    const rejectedCost = splitMap.get('rejected') ?? 0;
    const totalCost = successCost + wastedCost + rejectedCost;

    // Per-service status breakdown — lets the UI surface which service is
    // bleeding wasted spend without a separate round-trip.
    const byServiceStatus = await Cost.aggregate([
      { $match: dateMatch },
      { $unwind: '$services' },
      {
        $group: {
          _id: { service: '$services.service', status: '$services.status' },
          cost: { $sum: '$services.usage.cost' },
          operations: { $sum: 1 },
        },
      },
    ]);

    interface ServiceAggregate {
      service: string;
      totalCost: number;
      successCost: number;
      wastedCost: number;
      rejectedCost: number;
      operations: number;
    }

    const serviceMap = new Map<string, ServiceAggregate>();
    for (const row of byServiceStatus as { _id: { service: string; status: string }; cost: number; operations: number }[]) {
      const key = row._id.service;
      const bucket = serviceMap.get(key) ?? {
        service: key,
        totalCost: 0,
        successCost: 0,
        wastedCost: 0,
        rejectedCost: 0,
        operations: 0,
      };
      bucket.totalCost += row.cost;
      bucket.operations += row.operations;
      if (row._id.status === 'success') bucket.successCost += row.cost;
      else if (row._id.status === 'failed') bucket.wastedCost += row.cost;
      else if (row._id.status === 'rejected') bucket.rejectedCost += row.cost;
      serviceMap.set(key, bucket);
    }

    const byService = Array.from(serviceMap.values())
      .sort((a, b) => b.successCost - a.successCost)
      .map((s) => ({
        service: s.service,
        totalCost: parseFloat(s.totalCost.toFixed(6)),
        successCost: parseFloat(s.successCost.toFixed(6)),
        wastedCost: parseFloat(s.wastedCost.toFixed(6)),
        rejectedCost: parseFloat(s.rejectedCost.toFixed(6)),
        operations: s.operations,
      }));

    // Active user count in window — distinct users who accrued any cost.
    // Powers the "cost per active user" ratio in the overview card.
    const activeUserIds = await Cost.distinct('userId', dateMatch);
    const activeUsers = activeUserIds.length;

    // Total users lets the UI show "42 of 318 users accrued cost this window",
    // which frames the active-user number more usefully than a bare count.
    const totalUsers = await User.countDocuments({});

    // Projected monthly burn = current run-rate × (30 / days). Uses total cost
    // (including wasted) since that's the cash the provider actually bills.
    const projectedMonthlyCost = days > 0 ? (totalCost / days) * 30 : 0;

    return NextResponse.json({
      success: true,
      summary: {
        totalCost: parseFloat(totalCost.toFixed(6)),
        successCost: parseFloat(successCost.toFixed(6)),
        wastedCost: parseFloat(wastedCost.toFixed(6)),
        rejectedCost: parseFloat(rejectedCost.toFixed(6)),
        projectedMonthlyCost: parseFloat(projectedMonthlyCost.toFixed(6)),
        activeUsers,
        totalUsers,
        byService,
      },
      periodStart: startDate.toISOString(),
      periodEnd: endDate.toISOString(),
      days,
    });

  } catch (error) {
    console.error('Cost summary error:', error);
    return NextResponse.json(
      { success: false, message: 'Server error' },
      { status: 500 }
    );
  }
}
