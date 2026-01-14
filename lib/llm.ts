import { geminiLlm } from './sdk';
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

    const structuredLLM = geminiLlm.withStructuredOutput(LearningMaterialsSchema, {
      name: 'learning_materials',
    });

    // Track usage via callbacks
    const usage = {
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
    };

    const response = await structuredLLM.invoke(
      [new HumanMessage(prompt)],
      {
        timeout: 60000, // 60s timeout
        callbacks: [
          {
            handleLLMEnd: (output) => {
              const tokenUsage = output.llmOutput?.tokenUsage;
              if (tokenUsage) {
                usage.promptTokens = tokenUsage.promptTokens || 0;
                usage.completionTokens = tokenUsage.completionTokens || 0;
                usage.totalTokens = tokenUsage.totalTokens || 0;
              } else if (output.llmOutput?.estimatedTokenUsage) {
                 // Some providers might put it elsewhere
                 const est = output.llmOutput.estimatedTokenUsage;
                 usage.promptTokens = est.promptTokens || 0;
                 usage.completionTokens = est.completionTokens || 0;
                 usage.totalTokens = est.totalTokens || 0;
              }
            },
          },
        ],
      }
    );

    // LangChain automatically parses and validates the response using Zod
    const materials = response as LearningMaterials;

    console.log('✅ [LLM] Received and validated response');
    console.log(`✅ [LLM] Generated materials summary:`);
    console.log(`   - Flashcards: ${materials.flashcards.length}`);
    console.log(`   - Quizzes: ${materials.quizzes.length}`);
    console.log(`   - Chapters: ${materials.chapters.length}`);
    console.log(`   - Prerequisites: ${materials.prerequisites.length}`);
    console.log(`   - Video summary length: ${materials.videoSummary.length} chars`);

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
