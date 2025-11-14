/**
 * Cost logging utility for recording API usage expenses to MongoDB
 *
 * This module provides functions to log cost data for video generation
 * and other operations that consume third-party API resources.
 */

import mongoose from 'mongoose';
import Cost, { IServiceUsage } from '@/lib/models/Cost';

/**
 * Data structure for logging generation costs
 */
export interface IGenerationCostData {
  userId: mongoose.Types.ObjectId | string;
  videoId?: mongoose.Types.ObjectId | string;
  transcriptId?: mongoose.Types.ObjectId | string;
  services: IServiceUsage[];
  totalCost: number;
}

/**
 * Log cost data for a generation event
 *
 * Non-blocking operation - logs warnings on failure but does not throw errors.
 * This ensures cost logging failures don't break the main video processing pipeline.
 *
 * @param data - Cost data to log
 * @returns Promise<void>
 *
 * @example
 * await logGenerationCost({
 *   userId: new mongoose.Types.ObjectId('...'),
 *   videoId: new mongoose.Types.ObjectId('...'),
 *   services: [
 *     {
 *       service: ServiceType.APIFY_TRANSCRIPT,
 *       usage: { cost: 0.005, unitDetails: { duration: 1200 } },
 *       status: 'success'
 *     },
 *     {
 *       service: ServiceType.GROQ_LLM,
 *       usage: {
 *         cost: 0.001784,
 *         unitDetails: { inputTokens: 4521, outputTokens: 1843, totalTokens: 6364 }
 *       },
 *       status: 'success'
 *     }
 *   ],
 *   totalCost: 0.006784
 * });
 */
export async function logGenerationCost(data: IGenerationCostData): Promise<void> {
  try {
    // Validate required fields
    if (!data.userId) {
      console.warn('[COST LOGGER] Missing required field: userId');
      return;
    }

    if (!data.services || data.services.length === 0) {
      console.warn('[COST LOGGER] Missing or empty services array');
      return;
    }

    if (typeof data.totalCost !== 'number' || data.totalCost < 0) {
      console.warn('[COST LOGGER] Invalid totalCost:', data.totalCost);
      return;
    }

    // Convert string IDs to ObjectId if needed
    const costData = {
      userId: typeof data.userId === 'string' ? new mongoose.Types.ObjectId(data.userId) : data.userId,
      videoId: data.videoId ? (typeof data.videoId === 'string' ? new mongoose.Types.ObjectId(data.videoId) : data.videoId) : undefined,
      transcriptId: data.transcriptId ? (typeof data.transcriptId === 'string' ? new mongoose.Types.ObjectId(data.transcriptId) : data.transcriptId) : undefined,
      services: data.services,
      totalCost: data.totalCost,
    };

    // Create cost record in database
    const costRecord = new Cost(costData);
    await costRecord.save();

    // Log success for debugging (can be disabled in production)
    if (process.env.NODE_ENV === 'development') {
      console.log(`[COST LOGGER] Successfully logged cost record: $${data.totalCost.toFixed(6)}`);
    }
  } catch (error) {
    // Non-blocking: log warning but don't throw
    // This ensures cost logging failures don't break the main pipeline
    console.warn('[COST LOGGER] Failed to log cost data:', error);
    if (process.env.NODE_ENV === 'development') {
      console.warn('[COST LOGGER] Cost data:', JSON.stringify(data, null, 2));
    }
  }
}

/**
 * Calculate total cost from services array
 * Utility function to sum up costs from multiple services
 *
 * @param services - Array of service usage records
 * @returns Total cost (sum of all service costs)
 */
export function calculateTotalCost(services: IServiceUsage[]): number {
  const total = services.reduce((sum, service) => sum + service.usage.cost, 0);
  // Round to 6 decimal places
  return Math.round(total * 1_000_000) / 1_000_000;
}

/**
 * Format cost for logging/display
 *
 * @param cost - Cost in USD
 * @returns Formatted string (e.g., "$0.001784")
 */
export function formatCost(cost: number): string {
  return `$${cost.toFixed(6)}`;
}
