/**
 * Content Validation Module
 * 
 * Validates whether YouTube videos contain educational content before expensive LLM processing.
 * Philosophy: "Everything can be learned from" - Be permissive by default.
 * Only reject obvious non-educational content (music videos, pure entertainment, personal vlogs).
 */

import { geminiLlm } from './sdk';
import { CONTENT_VALIDATION_PROMPT } from './prompts';
import { HumanMessage } from '@langchain/core/messages';
import type { ITranscriptSegment } from './models/Video';
import SystemLog from './models/SystemLog';
import mongoose from 'mongoose';

/**
 * Validation result interface
 */
export interface ValidationResult {
  isEducational: boolean;
  confidence: number;         // 0.0-1.0
  reason: string;             // Human-readable explanation
  suggestedCategory?: string; // Optional category hint
  usage: {
    promptTokens: number;
    completionTokens: number;
  };
}

/**
 * Extract transcript snippet (first N seconds)
 * 
 * @param segments - Transcript segments with offset and duration
 * @param maxDurationSeconds - Maximum duration to extract (default: 120 seconds = 2 minutes)
 * @returns Concatenated text from first N seconds
 */
export function extractTranscriptSnippet(
  segments: ITranscriptSegment[],
  maxDurationSeconds: number = 120
): string {
  if (!segments || segments.length === 0) {
    return '';
  }

  const snippetSegments = segments.filter(seg => seg.offset < maxDurationSeconds);
  return snippetSegments.map(seg => seg.text).join(' ');
}

/**
 * Validate educational content using LLM classification
 * 
 * @param transcriptText - Full transcript text
 * @returns Validation result with decision, confidence, and token usage
 */
export async function validateEducationalContent(
  transcriptText: string
): Promise<ValidationResult> {
  console.log('🔍 [CONTENT VALIDATOR] Starting educational content validation...');

  try {
    // Extract snippet (first 120 seconds or 2000 characters, whichever is smaller)
    const snippetText = transcriptText.slice(0, 2000);
    console.log(`🔍 [CONTENT VALIDATOR] Analyzing snippet: ${snippetText.length} characters`);

    // Prepare prompt
    const prompt = CONTENT_VALIDATION_PROMPT.replace('[TRANSCRIPT_HERE]', snippetText);

    // Track token usage
    let promptTokens = 0;
    let completionTokens = 0;

    // Call LLM with usage tracking
    const response = await geminiLlm.invoke(
      [new HumanMessage(prompt)],
      {
        callbacks: [
          {
            handleLLMEnd(output) {
              const usage = output.llmOutput?.tokenUsage;
              if (usage) {
                promptTokens = usage.promptTokens || 0;
                completionTokens = usage.completionTokens || 0;
              }
            },
          },
        ],
      }
    );

    const content = response.content.toString();
    console.log(`🔍 [CONTENT VALIDATOR] Raw LLM response: ${content.slice(0, 200)}...`);

    // Parse JSON response
    let validationData: {
      isEducational: boolean;
      confidence: number;
      reason: string;
      suggestedCategory?: string;
    };

    try {
      // Try to extract JSON from response (handle markdown code blocks)
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }
      validationData = JSON.parse(jsonMatch[0]);
    } catch (parseError) {
      console.error('❌ [CONTENT VALIDATOR] Failed to parse LLM response:', parseError);
      // Fail-open: if we can't parse, allow the video
      return {
        isEducational: true,
        confidence: 0.5,
        reason: 'Failed to parse validation response - allowing by default',
        usage: { promptTokens, completionTokens },
      };
    }

    // Validate response structure
    if (
      typeof validationData.isEducational !== 'boolean' ||
      typeof validationData.confidence !== 'number' ||
      typeof validationData.reason !== 'string'
    ) {
      console.error('❌ [CONTENT VALIDATOR] Invalid response structure:', validationData);
      // Fail-open: if response is malformed, allow the video
      return {
        isEducational: true,
        confidence: 0.5,
        reason: 'Invalid validation response structure - allowing by default',
        usage: { promptTokens, completionTokens },
      };
    }

    console.log(`✅ [CONTENT VALIDATOR] Validation complete: ${validationData.isEducational ? 'EDUCATIONAL' : 'NON-EDUCATIONAL'} (confidence: ${validationData.confidence})`);
    console.log(`🔍 [CONTENT VALIDATOR] Reason: ${validationData.reason}`);
    console.log(`💰 [CONTENT VALIDATOR] Token usage: ${promptTokens} input + ${completionTokens} output`);

    return {
      ...validationData,
      usage: { promptTokens, completionTokens },
    };
  } catch (error) {
    console.error('❌ [CONTENT VALIDATOR] Validation failed:', error);
    // Fail-open: if validation fails, allow the video to proceed
    return {
      isEducational: true,
      confidence: 0.5,
      reason: `Validation error: ${error instanceof Error ? error.message : 'Unknown error'} - allowing by default`,
      usage: { promptTokens: 0, completionTokens: 0 },
    };
  }
}

/**
 * Log validation decision to SystemLog for analytics
 * 
 * @param params - Validation logging parameters
 */
export async function logValidationDecision(params: {
  userId: mongoose.Types.ObjectId | string;
  videoId: string;
  validation: ValidationResult;
  snippetLength: number;
  model: string;
}): Promise<void> {
  try {
    await SystemLog.create({
      category: 'content_validation',
      eventType: 'classification',
      userId: typeof params.userId === 'string' ? new mongoose.Types.ObjectId(params.userId) : params.userId,
      videoId: params.videoId,
      decision: params.validation.isEducational ? 'approved' : 'rejected',
      confidence: params.validation.confidence,
      reason: params.validation.reason,
      metadata: {
        model: params.model,
        snippetLength: params.snippetLength,
        suggestedCategory: params.validation.suggestedCategory,
        promptTokens: params.validation.usage.promptTokens,
        completionTokens: params.validation.usage.completionTokens,
      },
      timestamp: new Date(),
    });
    console.log('✅ [CONTENT VALIDATOR] Validation decision logged to SystemLog');
  } catch (error) {
    console.error('⚠️ [CONTENT VALIDATOR] Failed to log validation decision (non-critical):', error);
    // Don't throw - logging failure shouldn't break the flow
  }
}

/**
 * Log user override of validation decision
 * 
 * @param videoId - YouTube video ID
 * @param overrideReason - Optional reason provided by user
 */
export async function logValidationOverride(
  videoId: string,
  overrideReason?: string
): Promise<void> {
  try {
    await SystemLog.findOneAndUpdate(
      { 
        category: 'content_validation', 
        videoId: videoId,
        eventType: 'classification',
      },
      { 
        wasOverridden: true, 
        overriddenAt: new Date(),
        overrideReason: overrideReason,
        decision: 'overridden',
      },
      { sort: { timestamp: -1 } } // Get most recent classification
    );
    console.log('✅ [CONTENT VALIDATOR] User override logged to SystemLog');
  } catch (error) {
    console.error('⚠️ [CONTENT VALIDATOR] Failed to log override (non-critical):', error);
    // Don't throw - logging failure shouldn't break the flow
  }
}
