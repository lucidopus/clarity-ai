import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminToken } from '@/lib/adminAuth';
import dbConnect from '@/lib/mongodb';
import Cost from '@/lib/models/Cost';

/**
 * GET /api/admin/analytics/costs/summary
 *
 * Returns total cumulative spend and cost breakdown by service
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

    // Get all-time total cost
    const totalCostResult = await Cost.aggregate([
      {
        $group: {
          _id: null,
          totalCost: { $sum: '$totalCost' },
        }
      }
    ]);

    const totalCost = totalCostResult.length > 0 ? totalCostResult[0].totalCost : 0;

    // Get breakdown by service
    const byService = await Cost.aggregate([
      { $unwind: '$services' },
      {
        $group: {
          _id: '$services.service',
          totalCost: { $sum: '$services.usage.cost' },
        }
      },
      { $sort: { totalCost: -1 } }
    ]);

    // Format service breakdown
    const services = byService.map(service => ({
      service: service._id,
      totalCost: parseFloat(service.totalCost.toFixed(6)),
    }));

    return NextResponse.json({
      success: true,
      summary: {
        totalCost: parseFloat(totalCost.toFixed(6)),
        byService: services,
      }
    });

  } catch (error) {
    console.error('Cost summary error:', error);
    return NextResponse.json(
      { success: false, message: 'Server error' },
      { status: 500 }
    );
  }
}
