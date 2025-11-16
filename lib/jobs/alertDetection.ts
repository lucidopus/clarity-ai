import { startOfDay, subDays } from 'date-fns';
import Alert, { AlertType, AlertSeverity, AlertStatus } from '@/lib/models/Alert';
import CostAggregation from '@/lib/models/CostAggregation';
import Cost from '@/lib/models/Cost';
import User from '@/lib/models/User';
import connectDB from '@/lib/mongodb';

/**
 * Detect statistical outliers in daily spending
 * Triggers when daily cost > (moving_avg + 3 * std_dev)
 */
async function detectStatisticalOutliers(targetDate: Date): Promise<void> {
  const startDate = startOfDay(targetDate);

  // Get today's aggregation
  const todayAgg = await CostAggregation.findOne({ date: startDate });
  if (!todayAgg) {
    console.log('[Alert Detection] No aggregation found for today, skipping outlier detection');
    return;
  }

  const { dailyTotalCost, movingAverage30d, stdDev30d } = todayAgg;

  // Skip if no historical data
  if (movingAverage30d === 0 || stdDev30d === 0) {
    console.log('[Alert Detection] Insufficient historical data for outlier detection');
    return;
  }

  // Calculate threshold (mean + 3 * std dev)
  const threshold = movingAverage30d + (3 * stdDev30d);

  // Check if today's cost exceeds threshold
  if (dailyTotalCost > threshold) {
    const percentageAbove = ((dailyTotalCost - movingAverage30d) / movingAverage30d) * 100;

    // Determine severity
    let severity = AlertSeverity.LOW;
    if (dailyTotalCost > movingAverage30d + (4 * stdDev30d)) {
      severity = AlertSeverity.HIGH;
    } else if (dailyTotalCost > movingAverage30d + (3.5 * stdDev30d)) {
      severity = AlertSeverity.MEDIUM;
    }

    // Check if alert already exists for this date
    const existingAlert = await Alert.findOne({
      type: AlertType.STATISTICAL_OUTLIER,
      'context.date': startDate,
    });

    if (existingAlert) {
      console.log('[Alert Detection] Outlier alert already exists for this date, skipping');
      return;
    }

    // Create alert
    await Alert.create({
      type: AlertType.STATISTICAL_OUTLIER,
      severity,
      status: AlertStatus.NEW,
      message: `Daily spending anomaly detected: $${dailyTotalCost.toFixed(4)}`,
      description: `Daily cost on ${startDate.toISOString().split('T')[0]} was $${dailyTotalCost.toFixed(4)}, exceeding normal average by ${percentageAbove.toFixed(1)}%`,
      context: {
        date: startDate,
        dailyCost: dailyTotalCost,
        movingAverage30d,
        stdDev30d,
        threshold,
        percentageAboveNormal: parseFloat(percentageAbove.toFixed(2)),
        affectedResource: 'system',
      },
      auditTrail: [{
        status: AlertStatus.NEW,
        changedBy: null, // System-generated
        changedAt: new Date(),
      }],
    });

    console.log(`[Alert Detection] Created ${severity} outlier alert for ${startDate.toISOString()}`);
    console.log(`[Alert Detection] Daily cost: $${dailyTotalCost.toFixed(4)}, Threshold: $${threshold.toFixed(4)}, ${percentageAbove.toFixed(1)}% above normal`);
  } else {
    console.log('[Alert Detection] No statistical outliers detected');
  }
}

/**
 * Detect per-user cost spikes
 * Triggers when user_daily_cost > 2 * user_avg OR user_daily_cost > $0.50
 */
async function detectUserCostSpikes(targetDate: Date): Promise<void> {
  const startDate = startOfDay(targetDate);
  const endDate = startOfDay(subDays(targetDate, -1));

  // Get today's aggregation
  const todayAgg = await CostAggregation.findOne({ date: startDate });
  if (!todayAgg || todayAgg.byUser.length === 0) {
    console.log('[Alert Detection] No user costs for today, skipping spike detection');
    return;
  }

  // Process each user
  for (const userAgg of todayAgg.byUser) {
    const userId = userAgg.userId;
    const userDailyCost = userAgg.cost;

    // Skip low-cost users
    if (userDailyCost < 0.10) continue;

    // Calculate user's 7-day average (excluding today)
    const last7Days = startOfDay(subDays(targetDate, 7));
    const historicalAggs = await CostAggregation.find({
      date: { $gte: last7Days, $lt: startDate }
    }).select('byUser').lean();

    // Calculate user's historical average
    let totalHistoricalCost = 0;
    let daysWithActivity = 0;

    for (const agg of historicalAggs) {
      const userEntry = agg.byUser.find((u: any) => u.userId.toString() === userId.toString());
      if (userEntry) {
        totalHistoricalCost += userEntry.cost;
        daysWithActivity++;
      }
    }

    const userDailyAverage = daysWithActivity > 0 ? totalHistoricalCost / daysWithActivity : 0;

    // Skip if no historical data
    if (userDailyAverage === 0) continue;

    // Check thresholds: 2x average OR absolute $0.50
    const threshold2x = userDailyAverage * 2;
    const thresholdAbsolute = 0.50;
    const threshold = Math.min(threshold2x, thresholdAbsolute);

    if (userDailyCost > threshold) {
      // Get user details
      const user = await User.findById(userId).select('firstName lastName email').lean() as any;
      if (!user) continue;

      const userName = `${user.firstName} ${user.lastName}`;
      const userEmail = user.email;

      // Get recent operations breakdown
      const recentCosts = await Cost.find({
        userId,
        createdAt: { $gte: startDate, $lt: endDate }
      }).select('source').lean();

      const sourceBreakdown = new Map<string, number>();
      for (const cost of recentCosts) {
        sourceBreakdown.set(cost.source, (sourceBreakdown.get(cost.source) || 0) + 1);
      }

      const recentOperations = Array.from(sourceBreakdown.entries()).map(([source, count]) => ({
        source,
        count,
      }));

      // Check if alert already exists
      const existingAlert = await Alert.findOne({
        type: AlertType.USER_COST_SPIKE,
        'context.userId': userId,
        'context.date': startDate,
      });

      if (existingAlert) continue;

      // Determine severity
      const multiplier = userDailyCost / userDailyAverage;
      let severity = AlertSeverity.LOW;
      if (multiplier >= 4) {
        severity = AlertSeverity.HIGH;
      } else if (multiplier >= 3) {
        severity = AlertSeverity.MEDIUM;
      }

      // Create alert
      await Alert.create({
        type: AlertType.USER_COST_SPIKE,
        severity,
        status: AlertStatus.NEW,
        message: `User cost spike: ${userName} spent $${userDailyCost.toFixed(4)} (${multiplier.toFixed(1)}x average)`,
        description: `${userName} (${userEmail}) cost $${userDailyCost.toFixed(4)} on ${startDate.toISOString().split('T')[0]}, ${multiplier.toFixed(1)}x their average of $${userDailyAverage.toFixed(4)}`,
        context: {
          userId,
          userName,
          userEmail,
          userDailyCost,
          userDailyAverage,
          threshold,
          date: startDate,
          recentOperations,
          affectedResource: userId.toString(),
        },
        auditTrail: [{
          status: AlertStatus.NEW,
          changedBy: null, // System-generated
          changedAt: new Date(),
        }],
      });

      console.log(`[Alert Detection] Created ${severity} user spike alert for ${userName} ($${userDailyCost.toFixed(4)}, ${multiplier.toFixed(1)}x avg)`);
    }
  }
}

/**
 * Run all alert detection checks for a specific date
 */
export async function runAlertDetection(targetDate?: Date): Promise<{
  success: boolean;
  date: Date;
  alertsCreated: number;
  error?: string;
}> {
  try {
    await connectDB();

    const dateToCheck = targetDate || startOfDay(subDays(new Date(), 1));

    console.log(`[Alert Detection] Starting alert detection for ${dateToCheck.toISOString()}`);

    const initialAlertCount = await Alert.countDocuments({ 'context.date': dateToCheck });

    // Run detection algorithms
    await detectStatisticalOutliers(dateToCheck);
    await detectUserCostSpikes(dateToCheck);

    const finalAlertCount = await Alert.countDocuments({ 'context.date': dateToCheck });
    const alertsCreated = finalAlertCount - initialAlertCount;

    console.log(`[Alert Detection] Created ${alertsCreated} new alerts for ${dateToCheck.toISOString()}`);

    return { success: true, date: dateToCheck, alertsCreated };

  } catch (error) {
    console.error('[Alert Detection] Error:', error);
    return {
      success: false,
      date: targetDate || new Date(),
      alertsCreated: 0,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}
