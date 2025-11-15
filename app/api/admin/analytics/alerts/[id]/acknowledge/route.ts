import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminToken } from '@/lib/adminAuth';
import dbConnect from '@/lib/mongodb';
import Alert, { AlertStatus } from '@/lib/models/Alert';

/**
 * POST /api/admin/analytics/alerts/:id/acknowledge
 *
 * Acknowledge an alert
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const alertId = params.id;

    // Find alert
    const alert = await Alert.findById(alertId);

    if (!alert) {
      return NextResponse.json(
        { success: false, message: 'Alert not found' },
        { status: 404 }
      );
    }

    // Check if already acknowledged
    if (alert.status === AlertStatus.ACKNOWLEDGED || alert.status === AlertStatus.RESOLVED) {
      return NextResponse.json({
        success: true,
        message: 'Alert already acknowledged',
        alert: {
          id: alert._id.toString(),
          status: alert.status,
        }
      });
    }

    // Update status
    alert.status = AlertStatus.ACKNOWLEDGED;
    alert.auditTrail.push({
      status: AlertStatus.ACKNOWLEDGED,
      changedBy: null, // TODO: Add admin user ID once available
      changedAt: new Date(),
    });

    await alert.save();

    return NextResponse.json({
      success: true,
      message: 'Alert acknowledged successfully',
      alert: {
        id: alert._id.toString(),
        status: alert.status,
        type: alert.type,
        severity: alert.severity,
        message: alert.message,
        updatedAt: alert.updatedAt,
      }
    });

  } catch (error) {
    console.error('Alert acknowledge error:', error);
    return NextResponse.json(
      { success: false, message: 'Server error' },
      { status: 500 }
    );
  }
}
