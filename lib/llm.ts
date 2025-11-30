import { llm } from './sdk';
import { LEARNING_MATERIALS_PROMPT } from './prompts';
import { LearningMaterialsSchema, LearningMaterials } from './structuredOutput';
import {
  LLMTokenLimitError,
  LLMRateLimitError,
  LLMServiceError,
} from './errors/ApiError';
import { HumanMessage } from '@langchain/core/messages';

/**
 * Response type that includes both learning materials and token usage data
 */
export interface LLMGenerationResponse {
  materials: LearningMaterials;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export async function generateLearningMaterials(transcript: string): Promise<LLMGenerationResponse> {
  console.log('🤖 [LLM] Starting LLM generation...');
  console.log(`🤖 [LLM] Transcript length: ${transcript.length} characters`);

  try {
    const prompt = LEARNING_MATERIALS_PROMPT.replace('[TRANSCRIPT_HERE]', transcript);
    console.log(`🤖 [LLM] Prompt prepared, total length: ${prompt.length} characters`);

    // Use LangChain's withStructuredOutput for provider-agnostic structured generation
    console.log('🤖 [LLM] Calling LLM with LangChain structured output');

    const structuredLLM = llm.withStructuredOutput(LearningMaterialsSchema, {
      name: 'learning_materials',
    });

    const response = await structuredLLM.invoke([
      new HumanMessage(prompt)
    ]);

    // LangChain automatically parses and validates the response using Zod
    const materials = response as LearningMaterials;

    console.log('✅ [LLM] Received and validated response');
    console.log(`✅ [LLM] Generated materials summary:`);
    console.log(`   - Flashcards: ${materials.flashcards.length}`);
    console.log(`   - Quizzes: ${materials.quizzes.length}`);
    console.log(`   - Chapters: ${materials.chapters.length}`);
    console.log(`   - Prerequisites: ${materials.prerequisites.length}`);
    console.log(`   - Video summary length: ${materials.videoSummary.length} chars`);

    // Extract usage data from response metadata
    // Note: Usage tracking in LangChain is available via response metadata
    // We need to make a separate call to get usage or use callbacks
    const usage = {
      promptTokens: 0, // Will be populated via callback in production
      completionTokens: 0,
      totalTokens: 0,
    };

    // For now, we'll use a workaround by making a second call to get usage
    // In production, use LangChain callbacks for accurate token tracking
    try {
      const rawResponse = await llm.invoke([new HumanMessage(prompt)]);
      const metadata = rawResponse.response_metadata as any;
      if (metadata?.tokenUsage) {
        const tokenUsage = metadata.tokenUsage;
        usage.promptTokens = tokenUsage.promptTokens || 0;
        usage.completionTokens = tokenUsage.completionTokens || 0;
        usage.totalTokens = tokenUsage.totalTokens || 0;
      }
    } catch (usageError) {
      console.warn('⚠️ [LLM] Could not extract token usage (non-critical)');
    }

    console.log(`🤖 [LLM] Token usage: ${usage.promptTokens} input + ${usage.completionTokens} output = ${usage.totalTokens} total`);

    return { materials, usage };
  } catch (error) {
    console.error('❌ [LLM] Generation failed:', error);

    // Check if it's already one of our custom errors
    if (error instanceof LLMTokenLimitError ||
        error instanceof LLMRateLimitError ||
        error instanceof LLMServiceError) {
      throw error;
    }

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`❌ [LLM] Error details: ${errorMessage}`);

    if (error instanceof Error && error.stack) {
      console.error(`❌ [LLM] Stack trace:`, error.stack);
    }

    // Check for specific error patterns in the error message
    const errorStr = errorMessage.toLowerCase();

    // Check for rate limit errors
    if (errorStr.includes('rate limit') || errorStr.includes('429')) {
      throw new LLMRateLimitError();
    }

    // Check for token limit errors
    if ((errorStr.includes('token') && errorStr.includes('limit')) ||
        errorStr.includes('maximum context length') ||
        errorStr.includes('context_length_exceeded')) {
      throw new LLMTokenLimitError();
    }

    // Check for authentication errors
    if (errorStr.includes('auth') || errorStr.includes('api key') || errorStr.includes('unauthorized')) {
      throw new LLMServiceError('Invalid API key or authentication failed');
    }

    // Check for network errors
    if (error instanceof TypeError && errorStr.includes('fetch')) {
      throw new LLMServiceError('Network error while connecting to LLM service');
    }

    // For any other error, wrap in LLMServiceError
    throw new LLMServiceError(errorMessage);
  }
}
