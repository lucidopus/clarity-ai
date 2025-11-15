import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminToken } from '@/lib/adminAuth';
import dbConnect from '@/lib/mongodb';
import Alert, { AlertStatus, AlertType } from '@/lib/models/Alert';

/**
 * GET /api/admin/analytics/alerts?type=outlier&limit=20&status=NEW
 *
 * Returns alerts with optional filtering
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
    const typeParam = searchParams.get('type');
    const limitParam = searchParams.get('limit');
    const statusParam = searchParams.get('status');

    const limit = limitParam ? parseInt(limitParam, 10) : 20;

    // Build query
    const query: any = {};

    if (typeParam) {
      if (typeParam === 'outlier') {
        query.type = AlertType.STATISTICAL_OUTLIER;
      } else if (typeParam === 'user_spike') {
        query.type = AlertType.USER_COST_SPIKE;
      }
    }

    if (statusParam) {
      const statusUpper = statusParam.toUpperCase();
      if (Object.values(AlertStatus).includes(statusUpper as AlertStatus)) {
        query.status = statusUpper;
      }
    }

    // Get alerts
    const alerts = await Alert.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    // Format alerts
    const formattedAlerts = alerts.map(alert => ({
      id: alert._id.toString(),
      type: alert.type,
      severity: alert.severity,
      status: alert.status,
      message: alert.message,
      description: alert.description,
      context: alert.context,
      createdAt: alert.createdAt,
      updatedAt: alert.updatedAt,
      auditTrail: alert.auditTrail,
    }));

    return NextResponse.json({
      success: true,
      alerts: formattedAlerts,
      count: formattedAlerts.length,
    });

  } catch (error) {
    console.error('Alerts fetch error:', error);
    return NextResponse.json(
      { success: false, message: 'Server error' },
      { status: 500 }
    );
  }
}
