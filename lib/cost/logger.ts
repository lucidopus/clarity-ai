/**
 * Cost logging utility for recording API usage expenses to MongoDB
 *
 * This module provides functions to log cost data for video generation
 * and other operations that consume third-party API resources.
 */

import mongoose from 'mongoose';
import Cost, { IServiceUsage, CostSource } from '@/lib/models/Cost';

/**
 * Data structure for logging generation costs
 */
export interface IGenerationCostData {
  userId: mongoose.Types.ObjectId | string;
  source: CostSource; // where this cost originated
  videoId?: mongoose.Types.ObjectId | string;
  transcriptId?: mongoose.Types.ObjectId | string;
  problemId?: mongoose.Types.ObjectId | string; // for challenge chatbot costs
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
 * // Learning material generation
 * await logGenerationCost({
 *   userId: new mongoose.Types.ObjectId('...'),
 *   source: CostSource.LEARNING_MATERIAL_GENERATION,
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
 *
 * @example
 * // Learning chatbot message
 * await logGenerationCost({
 *   userId: new mongoose.Types.ObjectId('...'),
 *   source: CostSource.LEARNING_CHATBOT,
 *   videoId: new mongoose.Types.ObjectId('...'),
 *   services: [
 *     {
 *       service: ServiceType.GROQ_LLM,
 *       usage: {
 *         cost: 0.000342,
 *         unitDetails: { inputTokens: 1234, outputTokens: 456, totalTokens: 1690 }
 *       },
 *       status: 'success'
 *     }
 *   ],
 *   totalCost: 0.000342
 * });
 *
 * @example
 * // Challenge chatbot (AI Guide) message
 * await logGenerationCost({
 *   userId: new mongoose.Types.ObjectId('...'),
 *   source: CostSource.CHALLENGE_CHATBOT,
 *   videoId: new mongoose.Types.ObjectId('...'),
 *   problemId: new mongoose.Types.ObjectId('...'),
 *   services: [
 *     {
 *       service: ServiceType.GROQ_LLM,
 *       usage: {
 *         cost: 0.000412,
 *         unitDetails: { inputTokens: 1567, outputTokens: 589, totalTokens: 2156 }
 *       },
 *       status: 'success'
 *     }
 *   ],
 *   totalCost: 0.000412
 * });
 */
export async function logGenerationCost(data: IGenerationCostData): Promise<void> {
  try {
    // Validate required fields
    if (!data.userId) {
      console.warn('[COST LOGGER] Missing required field: userId');
      return;
    }

    if (!data.source) {
      console.warn('[COST LOGGER] Missing required field: source');
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

    // Helper function to check if a string is a 24-character hex ObjectId
    const isObjectIdFormat = (str: string): boolean => /^[0-9a-f]{24}$/i.test(str);

    // Convert string IDs to ObjectId if needed
    // userId and transcriptId are always MongoDB ObjectIds
    // videoId can be either a YouTube video ID string OR a MongoDB ObjectId
    // problemId can be either a problem ID string (e.g., "rp1") OR a MongoDB ObjectId
    const costData = {
      userId: typeof data.userId === 'string' ? new mongoose.Types.ObjectId(data.userId) : data.userId,
      source: data.source,
      videoId: data.videoId ? (
        typeof data.videoId === 'string'
          ? (isObjectIdFormat(data.videoId) ? new mongoose.Types.ObjectId(data.videoId) : data.videoId)
          : data.videoId
      ) : undefined,
      transcriptId: data.transcriptId ? (typeof data.transcriptId === 'string' ? new mongoose.Types.ObjectId(data.transcriptId) : data.transcriptId) : undefined,
      problemId: data.problemId ? (
        typeof data.problemId === 'string'
          ? (isObjectIdFormat(data.problemId) ? new mongoose.Types.ObjectId(data.problemId) : data.problemId)
          : data.problemId
      ) : undefined,
      services: data.services,
      totalCost: data.totalCost,
    };

    // Create cost record in database
    const costRecord = new Cost(costData);
    await costRecord.save();

    // Log success for debugging (can be disabled in production)
    if (process.env.NODE_ENV === 'development') {
      console.log(`[COST LOGGER] Successfully logged cost record (${data.source}): $${data.totalCost.toFixed(6)}`);
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
