import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminToken } from '@/lib/adminAuth';
import dbConnect from '@/lib/mongodb';
import Cost from '@/lib/models/Cost';

/**
 * GET /api/admin/analytics/costs/models
 *
 * Returns model usage comparison with efficiency metrics
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

    // Aggregate by model (extracted from metadata)
    const modelStats = await Cost.aggregate([
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

    // Format model data
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
    });

  } catch (error) {
    console.error('Cost models error:', error);
    return NextResponse.json(
      { success: false, message: 'Server error' },
      { status: 500 }
    );
  }
}
