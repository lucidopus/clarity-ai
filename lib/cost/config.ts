/**
 * Cost configuration for API services
 *
 * This file defines pricing rates for different LLM models and services.
 * The model-based pricing dictionary supports any LLM provider (Groq, OpenAI, Anthropic, Google, etc.)
 * with zero code changes - just update the dictionary and set the LLM_MODEL environment variable.
 */

/**
 * Token cost configuration for LLM models
 * Costs are per million tokens
 */
export interface ITokenCostConfig {
  inputTokensCost: number;   // per million tokens (USD)
  outputTokensCost: number;  // per million tokens (USD)
}

/**
 * Model-based pricing dictionary
 *
 * Keys: unique model identifiers (can be any string)
 * Values: pricing config object with input/output token costs
 *
 * To add a new model:
 * 1. Add an entry to this dictionary with the model's pricing
 * 2. Set LLM_MODEL environment variable to the key
 * 3. No code changes needed!
 *
 * Current Groq Models (as of 2025):
 * - openai/gpt-oss-120b: OpenAI GPT-OSS 120B
 * - llama-3.3-70b-versatile: Meta Llama 3.3 70B Versatile
 * - qwen/qwen3-32b: Alibaba Qwen3 32B
 *
 * Source: https://groq.com/pricing
 */
export const costs_per_model: Record<string, ITokenCostConfig> = {
  // OpenAI GPT-OSS 120B (Groq)
  // Input: $0.15 per million tokens
  // Output: $0.60 per million tokens
  'openai/gpt-oss-120b': {
    inputTokensCost: 0.15,
    outputTokensCost: 0.60,
  },

  // Meta Llama 3.3 70B Versatile (Groq)
  // Input: $0.59 per million tokens
  // Output: $0.79 per million tokens
  'llama-3.3-70b-versatile': {
    inputTokensCost: 0.59,
    outputTokensCost: 0.79,
  },

  // Alibaba Qwen3 32B (Groq)
  // Input: $0.29 per million tokens
  // Output: $0.59 per million tokens
  'qwen/qwen3-32b': {
    inputTokensCost: 0.29,
    outputTokensCost: 0.59,
  },

  // Example: Add future models here
  // 'anthropic/claude-3-opus': {
  //   inputTokensCost: 15.0,
  //   outputTokensCost: 75.0,
  // },
  // 'google/gemini-2.0-flash': {
  //   inputTokensCost: 0.075,
  //   outputTokensCost: 0.30,
  // },
};

/**
 * Fixed cost for Apify transcript extraction
 * $0.005 per call
 */
export const APIFY_FIXED_COST = 0.005;

/**
 * Get the current LLM model from environment variables
 * This should map to a key in costs_per_model
 */
export const getCurrentLLMModel = (): string => {
  const model = process.env.LLM_MODEL;
  if (!model) {
    throw new Error(
      'LLM_MODEL environment variable is not set. ' +
      'Please set it to a valid model identifier from the pricing dictionary.'
    );
  }
  return model;
};

/**
 * Get pricing config for the current LLM model
 */
export const getCurrentModelPricing = (): ITokenCostConfig => {
  const model = getCurrentLLMModel();
  const config = costs_per_model[model];

  if (!config) {
    throw new Error(
      `Model "${model}" not found in pricing dictionary. ` +
      `Available models: ${Object.keys(costs_per_model).join(', ')}`
    );
  }

  return config;
};
