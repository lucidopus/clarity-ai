import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminToken } from '@/lib/adminAuth';
import dbConnect from '@/lib/mongodb';
import Cost from '@/lib/models/Cost';

/**
 * GET /api/admin/analytics/costs/services
 *
 * Returns service efficiency comparison
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

    // Aggregate by service with success rate
    const serviceStats = await Cost.aggregate([
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
          totalCount: { $sum: 1 },
        }
      },
      { $sort: { totalCost: -1 } }
    ]);

    // Format service data
    const services = serviceStats.map(service => {
      const successRate = (service.successCount / service.totalCount) * 100;

      // Calculate efficiency score (based on success rate)
      // Normalize: 0-100 scale where 100 is best
      const efficiencyScore = successRate; // Simple version, can be enhanced

      return {
        service: service._id,
        totalCost: parseFloat(service.totalCost.toFixed(6)),
        successRate: parseFloat(successRate.toFixed(2)),
        efficiencyScore: parseFloat(efficiencyScore.toFixed(2)),
      };
    });

    // Sort by efficiency (best first)
    services.sort((a, b) => {
      // Primary: efficiency score (higher better)
      // Secondary: total cost (lower better)
      if (Math.abs(a.efficiencyScore - b.efficiencyScore) > 5) {
        return b.efficiencyScore - a.efficiencyScore;
      }
      return a.totalCost - b.totalCost;
    });

    return NextResponse.json({
      success: true,
      services,
    });

  } catch (error) {
    console.error('Cost services error:', error);
    return NextResponse.json(
      { success: false, message: 'Server error' },
      { status: 500 }
    );
  }
}
