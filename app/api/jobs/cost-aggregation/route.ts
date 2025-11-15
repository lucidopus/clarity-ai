import { NextRequest, NextResponse } from 'next/server';
import { runDailyCostAggregation } from '@/lib/jobs/costAggregation';
import { runAlertDetection } from '@/lib/jobs/alertDetection';
import { startOfDay, subDays, parseISO } from 'date-fns';

/**
 * POST /api/jobs/cost-aggregation
 *
 * Runs daily cost aggregation and alert detection
 * Can be triggered by cron services or manually
 *
 * Query params:
 * - date: YYYY-MM-DD (optional, defaults to yesterday)
 * - skipAlerts: true/false (optional, defaults to false)
 *
 * Security: Should be called by trusted cron services only
 * TODO: Add API key authentication in production
 */
export async function POST(request: NextRequest) {
  try {
    // Parse query params
    const searchParams = request.nextUrl.searchParams;
    const dateParam = searchParams.get('date');
    const skipAlertsParam = searchParams.get('skipAlerts');

    // Determine target date (default to yesterday)
    let targetDate: Date;
    if (dateParam) {
      try {
        targetDate = startOfDay(parseISO(dateParam));
      } catch (error) {
        return NextResponse.json({
          success: false,
          error: 'Invalid date format. Use YYYY-MM-DD'
        }, { status: 400 });
      }
    } else {
      targetDate = startOfDay(subDays(new Date(), 1));
    }

    const skipAlerts = skipAlertsParam === 'true';

    console.log(`[Cost Aggregation Job] Starting for date: ${targetDate.toISOString()}`);

    // Step 1: Run aggregation
    const aggResult = await runDailyCostAggregation(targetDate);
    if (!aggResult.success) {
      return NextResponse.json({
        success: false,
        error: aggResult.error,
        step: 'aggregation'
      }, { status: 500 });
    }

    // Step 2: Run alert detection (if not skipped)
    let alertResult = null;
    if (!skipAlerts) {
      alertResult = await runAlertDetection(targetDate);
      if (!alertResult.success) {
        console.error('[Cost Aggregation Job] Alert detection failed:', alertResult.error);
        // Don't fail the whole job if alerts fail
      }
    }

    console.log(`[Cost Aggregation Job] Completed successfully for ${targetDate.toISOString()}`);

    return NextResponse.json({
      success: true,
      date: targetDate.toISOString(),
      aggregation: {
        dailyTotalCost: aggResult.aggregation?.dailyTotalCost || 0,
        dailyOperations: aggResult.aggregation?.dailyOperations || 0,
      },
      alerts: skipAlerts ? null : {
        alertsCreated: alertResult?.alertsCreated || 0,
      }
    });

  } catch (error) {
    console.error('[Cost Aggregation Job] Unexpected error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * GET /api/jobs/cost-aggregation
 *
 * Returns information about the cost aggregation job
 */
export async function GET() {
  return NextResponse.json({
    name: 'Daily Cost Aggregation',
    description: 'Aggregates costs and detects anomalies',
    schedule: 'Daily at 00:00 UTC',
    usage: 'POST /api/jobs/cost-aggregation?date=YYYY-MM-DD&skipAlerts=false',
  });
}
