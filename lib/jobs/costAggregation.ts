import { startOfDay, subDays } from 'date-fns';
import Cost from '@/lib/models/Cost';
import CostAggregation from '@/lib/models/CostAggregation';
import connectDB from '@/lib/mongodb';

/**
 * Calculate moving average from historical aggregations
 */
async function calculateMovingAverage(days: number, targetDate: Date): Promise<number> {
  const startDate = startOfDay(subDays(targetDate, days));
  const endDate = startOfDay(targetDate);

  const aggregations = await CostAggregation.find({
    date: { $gte: startDate, $lt: endDate }
  }).select('dailyTotalCost').lean();

  if (aggregations.length === 0) return 0;

  const total = aggregations.reduce((sum, agg) => sum + agg.dailyTotalCost, 0);
  return total / aggregations.length;
}

/**
 * Calculate standard deviation from historical aggregations
 */
async function calculateStdDev(days: number, targetDate: Date, mean: number): Promise<number> {
  const startDate = startOfDay(subDays(targetDate, days));
  const endDate = startOfDay(targetDate);

  const aggregations = await CostAggregation.find({
    date: { $gte: startDate, $lt: endDate }
  }).select('dailyTotalCost').lean();

  if (aggregations.length < 2) return 0;

  const variance = aggregations.reduce((sum, agg) => {
    return sum + Math.pow(agg.dailyTotalCost - mean, 2);
  }, 0) / aggregations.length;

  return Math.sqrt(variance);
}

/**
 * Run daily cost aggregation for a specific date
 * @param targetDate - Date to aggregate (defaults to yesterday)
 */
export async function runDailyCostAggregation(targetDate?: Date): Promise<{
  success: boolean;
  date: Date;
  aggregation?: any;
  error?: string;
}> {
  try {
    await connectDB();

    // Default to yesterday (since job runs at 00:00 UTC for previous day)
    const dateToAggregate = targetDate || startOfDay(subDays(new Date(), 1));
    const startDate = startOfDay(dateToAggregate);
    const endDate = startOfDay(subDays(dateToAggregate, -1)); // Next day 00:00

    console.log(`[Cost Aggregation] Starting aggregation for ${startDate.toISOString()}`);

    // Check if aggregation already exists for this date
    const existingAgg = await CostAggregation.findOne({ date: startDate });
    if (existingAgg) {
      console.log(`[Cost Aggregation] Aggregation already exists for ${startDate.toISOString()}, skipping`);
      return { success: true, date: startDate, aggregation: existingAgg };
    }

    // Fetch all costs for the target date
    const costs = await Cost.find({
      createdAt: { $gte: startDate, $lt: endDate }
    }).lean();

    if (costs.length === 0) {
      console.log(`[Cost Aggregation] No costs found for ${startDate.toISOString()}`);
      // Still create an empty aggregation for consistency
      const emptyAgg = await CostAggregation.create({
        date: startDate,
        dailyTotalCost: 0,
        dailyInputTokens: 0,
        dailyOutputTokens: 0,
        dailyTotalTokens: 0,
        dailyOperations: 0,
        byService: [],
        bySource: [],
        byModel: [],
        byUser: [],
        movingAverage7d: 0,
        movingAverage30d: 0,
        stdDev7d: 0,
        stdDev30d: 0,
      });
      return { success: true, date: startDate, aggregation: emptyAgg };
    }

    // Calculate daily totals
    let dailyTotalCost = 0;
    let dailyInputTokens = 0;
    let dailyOutputTokens = 0;
    let dailyTotalTokens = 0;
    const dailyOperations = costs.length;

    // Aggregate by service
    const serviceMap = new Map<string, { cost: number; operations: number }>();

    // Aggregate by source
    const sourceMap = new Map<string, { cost: number; operations: number }>();

    // Aggregate by model
    const modelMap = new Map<string, {
      cost: number;
      inputTokens: number;
      outputTokens: number;
      totalTokens: number;
      operations: number;
    }>();

    // Aggregate by user
    const userMap = new Map<string, { cost: number; operations: number }>();

    // Process each cost record
    for (const cost of costs) {
      dailyTotalCost += cost.totalCost;

      // By source
      const sourceKey = cost.source;
      if (!sourceMap.has(sourceKey)) {
        sourceMap.set(sourceKey, { cost: 0, operations: 0 });
      }
      const sourceData = sourceMap.get(sourceKey)!;
      sourceData.cost += cost.totalCost;
      sourceData.operations += 1;

      // By user
      const userKey = cost.userId.toString();
      if (!userMap.has(userKey)) {
        userMap.set(userKey, { cost: 0, operations: 0 });
      }
      const userData = userMap.get(userKey)!;
      userData.cost += cost.totalCost;
      userData.operations += 1;

      // Process services
      for (const service of cost.services) {
        // By service
        const serviceKey = service.service;
        if (!serviceMap.has(serviceKey)) {
          serviceMap.set(serviceKey, { cost: 0, operations: 0 });
        }
        const serviceData = serviceMap.get(serviceKey)!;
        serviceData.cost += service.usage.cost;
        serviceData.operations += 1;

        // Extract tokens and model info
        const { unitDetails } = service.usage;
        if (unitDetails.inputTokens) dailyInputTokens += unitDetails.inputTokens;
        if (unitDetails.outputTokens) dailyOutputTokens += unitDetails.outputTokens;
        if (unitDetails.totalTokens) dailyTotalTokens += unitDetails.totalTokens;

        // By model (extract from metadata)
        const model = unitDetails.metadata?.model as string | undefined;
        if (model) {
          if (!modelMap.has(model)) {
            modelMap.set(model, {
              cost: 0,
              inputTokens: 0,
              outputTokens: 0,
              totalTokens: 0,
              operations: 0
            });
          }
          const modelData = modelMap.get(model)!;
          modelData.cost += service.usage.cost;
          modelData.inputTokens += unitDetails.inputTokens || 0;
          modelData.outputTokens += unitDetails.outputTokens || 0;
          modelData.totalTokens += unitDetails.totalTokens || 0;
          modelData.operations += 1;
        }
      }
    }

    // Convert maps to arrays
    const byService = Array.from(serviceMap.entries()).map(([service, data]) => ({
      service,
      cost: parseFloat(data.cost.toFixed(6)),
      operations: data.operations,
      avgCostPerOp: parseFloat((data.cost / data.operations).toFixed(6)),
    }));

    const bySource = Array.from(sourceMap.entries()).map(([source, data]) => ({
      source,
      cost: parseFloat(data.cost.toFixed(6)),
      operations: data.operations,
      percentage: parseFloat(((data.cost / dailyTotalCost) * 100).toFixed(2)),
    }));

    const byModel = Array.from(modelMap.entries()).map(([model, data]) => ({
      model,
      cost: parseFloat(data.cost.toFixed(6)),
      inputTokens: data.inputTokens,
      outputTokens: data.outputTokens,
      totalTokens: data.totalTokens,
      operations: data.operations,
      costPerToken: data.totalTokens > 0
        ? parseFloat((data.cost / data.totalTokens).toFixed(10))
        : 0,
    }));

    const byUser = Array.from(userMap.entries()).map(([userId, data]) => ({
      userId,
      cost: parseFloat(data.cost.toFixed(6)),
      operations: data.operations,
    }));

    // Calculate moving averages and standard deviations
    const movingAverage7d = await calculateMovingAverage(7, dateToAggregate);
    const movingAverage30d = await calculateMovingAverage(30, dateToAggregate);
    const stdDev7d = await calculateStdDev(7, dateToAggregate, movingAverage7d);
    const stdDev30d = await calculateStdDev(30, dateToAggregate, movingAverage30d);

    // Create aggregation document
    const aggregation = await CostAggregation.create({
      date: startDate,
      dailyTotalCost: parseFloat(dailyTotalCost.toFixed(6)),
      dailyInputTokens,
      dailyOutputTokens,
      dailyTotalTokens,
      dailyOperations,
      byService,
      bySource,
      byModel,
      byUser,
      movingAverage7d: parseFloat(movingAverage7d.toFixed(6)),
      movingAverage30d: parseFloat(movingAverage30d.toFixed(6)),
      stdDev7d: parseFloat(stdDev7d.toFixed(6)),
      stdDev30d: parseFloat(stdDev30d.toFixed(6)),
    });

    console.log(`[Cost Aggregation] Successfully aggregated costs for ${startDate.toISOString()}`);
    console.log(`[Cost Aggregation] Total cost: $${dailyTotalCost.toFixed(6)}, Operations: ${dailyOperations}`);

    return { success: true, date: startDate, aggregation };

  } catch (error) {
    console.error('[Cost Aggregation] Error:', error);
    return {
      success: false,
      date: targetDate || new Date(),
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}
