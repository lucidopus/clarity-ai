import { geminiLlm } from './sdk';
import { LEARNING_MATERIALS_PROMPT } from './prompts';
import { LearningMaterialsSchema, LearningMaterials } from './structuredOutput';
import {
  VideoMetadataSchema,
  FlashcardsSchema,
  QuizzesSchema,
  PrerequisitesSchema,
  RealWorldProblemsSchema,
  MindMapSchema,
  DetailedSummarySchema,
} from './structuredOutputPartial';
import {
  LLMTokenLimitError,
  LLMRateLimitError,
  LLMServiceError,
  LLMAuthenticationError,
  LLMPermissionError,
  LLMInvalidRequestError,
  LLMContentFilteredError,
  LLMTimeoutError,
  LLMUnavailableError,
  LLMOutputLimitError,
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

/**
 * Chunked generation response with tracking for incomplete materials
 */
export interface ChunkedGenerationResponse {
  materials: LearningMaterials;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  incompleteMaterials: string[];
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
        error instanceof LLMServiceError ||
        error instanceof LLMAuthenticationError ||
        error instanceof LLMPermissionError ||
        error instanceof LLMInvalidRequestError ||
        error instanceof LLMContentFilteredError ||
        error instanceof LLMTimeoutError ||
        error instanceof LLMUnavailableError ||
        error instanceof LLMOutputLimitError) {
      throw error;
    }

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`❌ [LLM] Error details: ${errorMessage}`);

    if (error instanceof Error && error.stack) {
      console.error(`❌ [LLM] Stack trace:`, error.stack);
    }

    // Check for specific error patterns in the error message
    const errorStr = errorMessage.toLowerCase();

    // Authentication errors (401)
    if (errorStr.includes('auth') || errorStr.includes('api key') || 
        errorStr.includes('unauthorized') || errorStr.includes('unauthenticated')) {
      throw new LLMAuthenticationError();
    }

    // Permission errors (403)
    if (errorStr.includes('permission') || errorStr.includes('forbidden')) {
      throw new LLMPermissionError();
    }

    // Rate limit errors (429)
    if (errorStr.includes('rate limit') || errorStr.includes('429') || 
        errorStr.includes('resource_exhausted') || errorStr.includes('quota')) {
      throw new LLMRateLimitError();
    }

    // Token limit errors - INPUT (context length exceeded)
    if ((errorStr.includes('context') && errorStr.includes('length')) ||
        (errorStr.includes('token') && errorStr.includes('limit') && errorStr.includes('input')) ||
        errorStr.includes('context_length_exceeded') ||
        errorStr.includes('maximum context length')) {
      throw new LLMTokenLimitError();
    }

    // Token limit errors - OUTPUT
    if (errorStr.includes('output') && errorStr.includes('limit')) {
      throw new LLMOutputLimitError();
    }

    // Content safety filtering
    if (errorStr.includes('recitation')) {
      throw new LLMContentFilteredError('RECITATION');
    }
    if (errorStr.includes('safety') && (errorStr.includes('block') || errorStr.includes('filter'))) {
      throw new LLMContentFilteredError('SAFETY');
    }

    // Timeout errors (504)
    if (errorStr.includes('timeout') || errorStr.includes('deadline') || 
        errorStr.includes('504') || errorStr.includes('deadline_exceeded')) {
      throw new LLMTimeoutError();
    }

    // Service unavailable (503)
    if (errorStr.includes('503') || errorStr.includes('unavailable') || 
        errorStr.includes('overload') || errorStr.includes('capacity')) {
      throw new LLMUnavailableError();
    }

    // Invalid request format (400)
    if ((errorStr.includes('invalid') && (errorStr.includes('argument') || errorStr.includes('request'))) ||
        errorStr.includes('malformed') || errorStr.includes('failed_precondition')) {
      throw new LLMInvalidRequestError(errorMessage);
    }

    // Network errors
    if (error instanceof TypeError && errorStr.includes('fetch')) {
      throw new LLMServiceError('Network error while connecting to LLM service');
    }

    // For any other error, wrap in LLMServiceError
    throw new LLMServiceError(errorMessage);
  }
}

/**
 * Generate a comprehensive detailed summary from transcript
 * Used for chunked generation to condense long transcripts while preserving key information
 */
export async function generateDetailedSummary(transcript: string): Promise<string> {
  console.log('📝 [SUMMARY] Generating detailed summary from transcript...');
  console.log(`📝 [SUMMARY] Transcript length: ${transcript.length} characters`);

  try {
    const summaryLLM = geminiLlm.withStructuredOutput(DetailedSummarySchema, {
      name: 'detailed_summary',
    });

    const summaryPrompt = `Analyze this complete video transcript and create a comprehensive, detailed summary.

Transcript:
${transcript}

Generate a 1500-2000 word summary that captures ALL critical information with minimal loss. Include:
- Main concepts with detailed explanations
- Important examples and specific details
- Technical terminology and definitions
- Key arguments and supporting evidence
- Practical applications and use cases
- Step-by-step processes or workflows
- Important quotes or data points
- Critical nuances or caveats

Be thorough and comprehensive - this summary will be used to generate all learning materials.`;

    const result = await summaryLLM.invoke([new HumanMessage(summaryPrompt)], { 
      timeout: 120000 // 120s timeout for initial summarization
    });

    const wordCount = result.detailedSummary.split(/\s+/).length;
    console.log(`✅ [SUMMARY] Generated detailed summary with ${wordCount} words`);
    
    return result.detailedSummary;
  } catch (error) {
    console.error('❌ [SUMMARY] Failed to generate detailed summary:', error);
    console.warn('⚠️ [SUMMARY] Falling back to truncated transcript (first 20K chars)');
    
    // Fallback: use first 20K characters of transcript
    return transcript.slice(0, 20000) + '\n\n[Note: This is a truncated version of the full transcript due to summarization failure]';
  }
}

/**
 * Chunked generation - splits LLM calls to avoid token limits
 * Generates materials in 6 separate calls instead of 1
 * @param transcript - Full transcript text
 * @param incompleteMaterials - Optional array of material types to regenerate. If not provided, generates all materials.
 */
export async function generateLearningMaterialsChunked(
  transcript: string, 
  incompleteMaterials?: string[]
): Promise<ChunkedGenerationResponse> {
  const materialsToGenerate = incompleteMaterials || [];
  const isSelectiveRetry = materialsToGenerate.length > 0;
  
  console.log('🔧 [LLM CHUNKED] Starting chunked generation for token limit handling...');
  console.log(`🔧 [LLM CHUNKED] Transcript length: ${transcript.length} characters`);
  if (isSelectiveRetry) {
    console.log(`🎯 [LLM CHUNKED] Selective retry - only generating: ${materialsToGenerate.join(', ')}`);
  }

  const failedChunks: string[] = [];
  const totalUsage = {
    promptTokens: 0,
    completionTokens: 0,
    totalTokens: 0,
  };

  try {
    // STEP 0: Generate detailed summary from full transcript
    // This condensed version (1500-2000 words) will be used for all material generation
    console.log('🔧 [STEP 0/6] Generating condensed detailed summary...');
    const detailedSummary = await generateDetailedSummary(transcript);
    console.log('✅ [STEP 0/6] Condensed summary ready for material generation');

    // CHUNK 1: Video Metadata (title, category, tags, summary, chapters)
    let metadata;
    const needsMetadata = !isSelectiveRetry || materialsToGenerate.includes('metadata');
    
    if (!needsMetadata) {
      console.log('⏭️  [CHUNK 1/6] Skipping metadata - already exists');
      metadata = {
        title: 'Video Title',
        category: 'Technology',
        tags: ['video'],
        videoSummary: 'Summary unavailable',
        chapters: [],
      };
    } else {
      console.log('🔧 [CHUNK 1/6] Generating video metadata...');
      try {
        const metadataLLM = geminiLlm.withStructuredOutput(VideoMetadataSchema, {
          name: 'video_metadata',
        });
        
        const metadataPrompt = `Analyze this detailed video summary and provide metadata.\n\nDetailed Summary:\n${detailedSummary}\n\nGenerate:\n- Title: Concise, descriptive title\n- Category: Choose the best fit category\n- Tags: 5-8 specific keywords (lowercase)\n- Summary: 200-300 word summary for display\n- Chapters: 3-5 key moments with timestamps`;
        
        metadata = await metadataLLM.invoke([new HumanMessage(metadataPrompt)], { timeout: 60000 });
        console.log('✅ [CHUNK 1/6] Metadata generated');
      } catch (error) {
        console.error('❌ [CHUNK 1/6] Metadata generation failed:', error);
        failedChunks.push('metadata');
        // Use defaults
        metadata = {
          title: 'Video Title',
          category: 'Technology',
          tags: ['video'],
          videoSummary: 'Summary unavailable',
          chapters: [],
        };
      }
    }

    // CHUNK 2: Flashcards
    let flashcardsData;
    const needsFlashcards = !isSelectiveRetry || materialsToGenerate.includes('flashcards');
    
    if (!needsFlashcards) {
      console.log('⏭️  [CHUNK 2/6] Skipping flashcards - already exists');
      flashcardsData = { flashcards: [] };
    } else {
      console.log('🔧 [CHUNK 2/6] Generating flashcards...');
      try {
        const flashcardsLLM = geminiLlm.withStructuredOutput(FlashcardsSchema, {
          name: 'flashcards',
        });
        
        const flashcardsPrompt = `Based on this detailed video summary, create comprehensive flashcards.\n\nDetailed Summary:\n${detailedSummary}\n\nGenerate 5-15 flashcards covering key concepts from throughout the entire video. Include easy, medium, and hard difficulty levels. Cover important details, definitions, and concepts.`;
        
        flashcardsData = await flashcardsLLM.invoke([new HumanMessage(flashcardsPrompt)], { timeout: 60000 });
        console.log(`✅ [CHUNK 2/6] Generated ${flashcardsData.flashcards.length} flashcards`);
      } catch (error) {
        console.error('❌ [CHUNK 2/6] Flashcards generation failed:', error);
        failedChunks.push('flashcards');
        flashcardsData = { flashcards: [] };
      }
    }

    // CHUNK 3: Quizzes
    let quizzesData;
    const needsQuizzes = !isSelectiveRetry || materialsToGenerate.includes('quizzes');
    
    if (!needsQuizzes) {
      console.log('⏭️  [CHUNK 3/6] Skipping quizzes - already exists');
      quizzesData = { quizzes: [] };
    } else {
      console.log('🔧 [CHUNK 3/6] Generating quizzes...');
      try {
        const quizzesLLM = geminiLlm.withStructuredOutput(QuizzesSchema, {
          name: 'quizzes',
        });
        
        const quizzesPrompt = `Based on this detailed video summary, create comprehensive quiz questions.\n\nDetailed Summary:\n${detailedSummary}\n\nGenerate 10-15 multiple-choice questions with detailed explanations. Cover key concepts, important details, and practical applications from throughout the entire video.`;
        
        quizzesData = await quizzesLLM.invoke([new HumanMessage(quizzesPrompt)], { timeout: 60000 });
        console.log(`✅ [CHUNK 3/6] Generated ${quizzesData.quizzes.length} quizzes`);
      } catch (error) {
        console.error('❌ [CHUNK 3/6] Quizzes generation failed:', error);
        failedChunks.push('quizzes');
        quizzesData = { quizzes: [] };
      }
    }

    // CHUNK 4: Prerequisites
    let prerequisitesData;
    const needsPrerequisites = !isSelectiveRetry || materialsToGenerate.includes('prerequisites');
    
    if (!needsPrerequisites) {
      console.log('⏭️  [CHUNK 4/6] Skipping prerequisites - already exists');
      prerequisitesData = { prerequisites: [] };
    } else {
      console.log('🔧 [CHUNK 4/6] Generating prerequisites...');
      try {
        const prerequisitesLLM = geminiLlm.withStructuredOutput(PrerequisitesSchema, {
          name: 'prerequisites',
        });
        
        const prerequisitesPrompt = `Based on this detailed video summary, identify all prerequisite knowledge.\n\nDetailed Summary:\n${detailedSummary}\n\nGenerate 2-3 prerequisite topics needed to understand this content. Consider all concepts, terminology, and background knowledge required throughout the entire video.`;
        
        prerequisitesData = await prerequisitesLLM.invoke([new HumanMessage(prerequisitesPrompt)], { timeout: 60000 });
        console.log(`✅ [CHUNK 4/6] Generated ${prerequisitesData.prerequisites.length} prerequisites`);
      } catch (error) {
        console.error('❌ [CHUNK 4/6] Prerequisites generation failed:', error);
        failedChunks.push('prerequisites');
        prerequisitesData = { prerequisites: [] };
      }
    }

    // CHUNK 5: Real-world Problems
    let realWorldProblemsData;
    const needsCaseStudies = !isSelectiveRetry || materialsToGenerate.includes('casestudies');
    
    if (!needsCaseStudies) {
      console.log('⏭️  [CHUNK 5/6] Skipping case studies - already exists');
      realWorldProblemsData = { realWorldProblems: [] };
    } else {
      console.log('🔧 [CHUNK 5/6] Generating real-world problems...');
      try {
        const realWorldProblemsLLM = geminiLlm.withStructuredOutput(RealWorldProblemsSchema, {
          name: 'real_world_problems',
        });
        
        const realWorldProblemsPrompt = `Based on this detailed video summary, create comprehensive real-world case studies.\n\nDetailed Summary:\n${detailedSummary}\n\nGenerate 1-3 real-world problems that apply the concepts taught throughout the entire video. Include practical scenarios that demonstrate the material in action.`;
        
        realWorldProblemsData = await realWorldProblemsLLM.invoke([new HumanMessage(realWorldProblemsPrompt)], { timeout: 60000 });
        console.log(`✅ [CHUNK 5/6] Generated ${realWorldProblemsData.realWorldProblems.length} case studies`);
      } catch (error) {
        console.error('❌ [CHUNK 5/6] Real-world problems generation failed:', error);
        failedChunks.push('casestudies');
        realWorldProblemsData = { realWorldProblems: [] };
      }
    }

    // CHUNK 6: Mind Map
    let mindMapData;
    const needsMindMap = !isSelectiveRetry || materialsToGenerate.includes('mindmap');
    
    if (!needsMindMap) {
      console.log('⏭️  [CHUNK 6/6] Skipping mind map - already exists');
      mindMapData = { mindMap: { nodes: [], edges: [] } };
    } else {
      console.log('🔧 [CHUNK 6/6] Generating mind map...');
      try {
        const mindMapLLM = geminiLlm.withStructuredOutput(MindMapSchema, {
          name: 'mind_map',
        });
        
        const mindMapPrompt = `Based on this detailed video summary, create a comprehensive hierarchical mind map.\n\nDetailed Summary:\n${detailedSummary}\n\nGenerate nodes and edges showing all major concepts and their relationships throughout the entire video. Create a detailed map that captures the full knowledge structure.`;
        
        mindMapData = await mindMapLLM.invoke([new HumanMessage(mindMapPrompt)], { timeout: 180000 }); // Increased to 180s for complex graphs
        console.log(`✅ [CHUNK 6/6] Generated mind map with ${mindMapData.mindMap.nodes.length} nodes`);
      } catch (error) {
        console.error('❌ [CHUNK 6/6] Mind map generation failed:', error);
        failedChunks.push('mindmap');
        mindMapData = { mindMap: { nodes: [], edges: [] } };
      }
    }

    // Merge all chunks
    const materials: LearningMaterials = {
      title: metadata.title,
      category: metadata.category as LearningMaterials['category'],
      tags: metadata.tags,
      videoSummary: metadata.videoSummary,
      chapters: metadata.chapters,
      flashcards: flashcardsData.flashcards,
      quizzes: quizzesData.quizzes,
      prerequisites: prerequisitesData.prerequisites,
      realWorldProblems: realWorldProblemsData.realWorldProblems,
      mindMap: mindMapData.mindMap,
    };

    console.log('✅ [LLM CHUNKED] All chunks processed!');
    console.log(`📊 Failed chunks: ${failedChunks.length > 0 ? failedChunks.join(', ') : 'None'}`);
    
    // Summary of what was generated
    console.log('\n📋 [SUMMARY] Chunked Generation Results:');
    console.log(`   📝 Title: ${materials.title}`);
    console.log(`   📂 Category: ${materials.category}`);
    console.log(`   🏷️  Tags: ${materials.tags.join(', ')}`);
    console.log(`   📚 Generated Materials:`);
    console.log(`      - Flashcards: ${materials.flashcards.length}`);
    console.log(`      - Quizzes: ${materials.quizzes.length}`);
    console.log(`      - Prerequisites: ${materials.prerequisites.length}`);
    console.log(`      - Case Studies: ${materials.realWorldProblems.length}`);
    console.log(`      - Mind Map Nodes: ${materials.mindMap.nodes.length}`);
    console.log(`      - Chapters: ${materials.chapters.length}`);
    console.log('\n📄 [DETAILED SUMMARY] Generated Summary:');
    console.log('---');
    console.log(detailedSummary);
    console.log('---\n');

    return {
      materials,
      usage: totalUsage,
      incompleteMaterials: failedChunks,
    };
  } catch (error) {
    console.error('💥 [LLM CHUNKED] Fatal error in chunked generation:', error);
    throw error;
  }
}
