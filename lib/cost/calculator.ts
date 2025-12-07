/**
 * Cost calculation utilities for API usage
 *
 * This module calculates costs for LLM token usage and Apify transcript extraction
 * based on the pricing configuration defined in config.ts
 */

import { getCurrentModelPricing, getCurrentLLMModel, APIFY_FIXED_COST, costs_per_model } from './config';

/**
 * Calculate LLM cost based on token usage
 *
 * Looks up the current model from CONTENT_GENERATION_MODEL environment variable (default)
 * or uses the provided modelName.
 *
 * Formula: (inputTokens / 1,000,000) * inputCost + (outputTokens / 1,000,000) * outputCost
 *
 * @param inputTokens - Number of input tokens (prompt tokens)
 * @param outputTokens - Number of output tokens (completion tokens)
 * @param modelName - Optional model name to use instead of env var
 * @returns Cost in USD (rounded to 6 decimal places)
 * @throws Error if model not found in pricing dictionary
 *
 * @example
 * // With model=openai/gpt-oss-120b (input: $0.15/M, output: $0.60/M)
 * calculateLLMCost(4521, 1843)
 * // Returns: 0.001784 (4521/1M * 0.15 + 1843/1M * 0.60 = 0.000678 + 0.001106)
 */
export function calculateLLMCost(inputTokens: number, outputTokens: number, modelName?: string): number {
  // Validate inputs
  if (inputTokens < 0 || outputTokens < 0) {
    throw new Error('Token counts cannot be negative');
  }

  // Get current model pricing from environment variable or provided model name
  // (Validates that model exists in pricing dict)
  let model = modelName;
  if (!model) {
     model = getCurrentLLMModel();
  }
  
  const pricing = costs_per_model[model];

  if (!pricing) {
    throw new Error(
      `Model "${model}" not found in pricing dictionary. ` +
      `Available models: ${Object.keys(costs_per_model).join(', ')}`
    );
  }

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
export function getCurrentModelInfo(modelName?: string) {
  const model = modelName || getCurrentLLMModel();
  const pricing = costs_per_model[model] || (modelName ? undefined : getCurrentModelPricing());

  if (!pricing) {
      throw new Error(`Model info not found for ${model}`);
  }

  return {
    model,
    inputCostPerMillion: pricing.inputTokensCost,
    outputCostPerMillion: pricing.outputTokensCost,
  };
}
