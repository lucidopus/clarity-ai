/**
 * Cost calculation utilities for API usage
 *
 * This module calculates costs for LLM token usage and Apify transcript extraction
 * based on the pricing configuration defined in config.ts
 */

import { getCurrentModelPricing, getCurrentLLMModel, APIFY_FIXED_COST } from './config';

/**
 * Calculate LLM cost based on token usage
 *
 * Looks up the current model from LLM_MODEL environment variable
 * and calculates cost using the model's pricing configuration.
 *
 * Formula: (inputTokens / 1,000,000) * inputCost + (outputTokens / 1,000,000) * outputCost
 *
 * @param inputTokens - Number of input tokens (prompt tokens)
 * @param outputTokens - Number of output tokens (completion tokens)
 * @returns Cost in USD (rounded to 6 decimal places)
 * @throws Error if LLM_MODEL env var is not set or model not found in pricing dictionary
 *
 * @example
 * // With LLM_MODEL=openai/gpt-oss-120b (input: $0.15/M, output: $0.60/M)
 * calculateLLMCost(4521, 1843)
 * // Returns: 0.001784 (4521/1M * 0.15 + 1843/1M * 0.60 = 0.000678 + 0.001106)
 */
export function calculateLLMCost(inputTokens: number, outputTokens: number): number {
  // Validate inputs
  if (inputTokens < 0 || outputTokens < 0) {
    throw new Error('Token counts cannot be negative');
  }

  // Get current model pricing from environment variable
  const model = getCurrentLLMModel();
  const pricing = getCurrentModelPricing();

  // Calculate cost per formula
  const inputCost = (inputTokens / 1_000_000) * pricing.inputTokensCost;
  const outputCost = (outputTokens / 1_000_000) * pricing.outputTokensCost;
  const totalCost = inputCost + outputCost;

  // Round to 6 decimal places to avoid floating point precision issues
  return Math.round(totalCost * 1_000_000) / 1_000_000;
}

/**
 * Calculate Apify transcript extraction cost
 *
 * Fixed cost per transcript extraction call.
 *
 * @returns Fixed cost in USD ($0.005)
 *
 * @example
 * calculateApifyCost()
 * // Returns: 0.005
 */
export function calculateApifyCost(): number {
  return APIFY_FIXED_COST;
}

/**
 * Get details about the current LLM model being used
 * Useful for logging and debugging
 *
 * @returns Object with model name and pricing info
 */
export function getCurrentModelInfo() {
  const model = getCurrentLLMModel();
  const pricing = getCurrentModelPricing();

  return {
    model,
    inputCostPerMillion: pricing.inputTokensCost,
    outputCostPerMillion: pricing.outputTokensCost,
  };
}
