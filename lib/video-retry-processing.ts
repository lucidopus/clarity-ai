import { generateLearningMaterialsChunked } from './llm';
import { generateEmbeddings } from './embedding';
import { GEMINI_MODEL_NAME } from './sdk';
import { calculateLLMCost } from './cost/calculator';
import { logGenerationCost, calculateTotalCost, formatCost } from './cost/logger';
import { CostSource } from './models/Cost';
import { ServiceType } from './models';
import type { IServiceUsage } from './models/Cost';
import Video from './models/Video';
import Source from './models/Source';
import SourceContent from './models/SourceContent';
import Flashcard from './models/Flashcard';
import Quiz from './models/Quiz';
import LearningMaterial from './models/LearningMaterial';
import { MindMap } from './models';
import ActivityLog from './models/ActivityLog';

/**
 * Shared utility functions for video retry processing
 *
 * Updated to support the dual-write architecture (Video + Source collections)
 * and include activity logging + cost tracking on retry.
 */

// Type definitions for video retry processing
interface TranscriptSegment {
  text: string;
  offset: number;
  duration: number;
}

// Use Record types for flexibility with LLM output structures
type RealWorldProblem = Record<string, unknown> & { id: string };
type FlashcardItem = Record<string, unknown> & { question: string; answer: string };
type QuizItem = Record<string, unknown> & { questionText: string; options: string[] };

interface LearningMaterials {
  title: string;
  category: string;
  tags: string[];
  videoSummary: string;
  chapters?: Array<Record<string, unknown>>;
  flashcards?: FlashcardItem[];
  quizzes?: QuizItem[];
  prerequisites?: Array<Record<string, unknown>>;
  realWorldProblems?: RealWorldProblem[];
  mindMap?: { nodes: unknown[]; edges?: unknown[] };
}

interface VideoDocument {
  _id: string;
  videoId: string;
  userId: string;
  title?: string;
  summary?: string;
  transcript: TranscriptSegment[];
  embedding?: number[];
  incompleteMaterials?: string[];
  errorType?: string;
}

import { isTokenLimitError, isPermanentError } from './utils/error-logic';

export { isTokenLimitError, isPermanentError };

// ─── Helper: Get transcript text ─────────────────────────────────────────────

/**
 * Get transcript text from SourceContent (preferred) or Video (fallback).
 * SourceContent stores the canonical fullText from the extractor pipeline.
 */
async function getTranscriptText(video: VideoDocument): Promise<string> {
  // Try SourceContent first (new architecture)
  const sourceContent = await SourceContent.findOne({
    sourceId: video.videoId,
    userId: video.userId,
  });

  if (sourceContent?.fullText) {
    console.log(`📄 [RETRY] Using transcript from SourceContent (${sourceContent.wordCount} words)`);
    return sourceContent.fullText;
  }

  // Fallback to Video.transcript (legacy)
  if (video.transcript?.length > 0) {
    console.log(`📄 [RETRY] Falling back to Video.transcript (${video.transcript.length} segments)`);
    return video.transcript.map((s) => s.text).join(' ');
  }

  throw new Error(`No transcript found for video ${video.videoId}`);
}

// ─── Helper: Update status on both Video + Source ────────────────────────────

async function updateDualStatus(
  video: VideoDocument,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  payload: Record<string, any>
) {
  await Video.findByIdAndUpdate(video._id, payload);
  await Source.findOneAndUpdate(
    { userId: video.userId, sourceId: video.videoId },
    payload
  );
}

// ─── Helper: Generate embedding ──────────────────────────────────────────────

async function generateVideoEmbedding(
  video: VideoDocument,
  materials: LearningMaterials,
  transcript: string
): Promise<number[]> {
  if (video.embedding && video.embedding.length > 0) {
    console.log(`⏭️  [RETRY] Skipping embedding - already exists (${video.embedding.length}d)`);
    return video.embedding;
  }

  console.log(`🧠 [RETRY] Generating embedding for ${video.videoId}...`);
  try {
    const embeddingContext = `
      Title: ${materials.title}
      Category: ${materials.category}
      Summary: ${materials.videoSummary}
      Tags: ${materials.tags.join(', ')}
      Transcript Start: ${transcript.slice(0, 1000)}
    `.trim();

    const embeddingResult = await generateEmbeddings(embeddingContext);
    const embedding = Array.isArray(embeddingResult) && Array.isArray(embeddingResult[0])
      ? (embeddingResult as number[][])[0]
      : (embeddingResult as number[]);

    console.log(`✅ [RETRY] Generated embedding for ${video.videoId}`);
    return embedding;
  } catch (embError) {
    console.warn(`⚠️ [RETRY] Embedding generation failed (non-critical):`, embError as Record<string, unknown>);
    return [];
  }
}

// ─── Helper: Log activity for retry ──────────────────────────────────────────

async function logRetryActivity(
  video: VideoDocument,
  materials: LearningMaterials
) {
  try {
    const now = new Date();
    const startOfDay = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

    await ActivityLog.create({
      userId: video.userId,
      activityType: 'video_generated',
      sourceId: video.videoId,
      date: startOfDay,
      timestamp: now,
      metadata: {
        flashcardsGenerated: materials.flashcards?.length || 0,
        quizzesGenerated: materials.quizzes?.length || 0,
        chaptersGenerated: materials.chapters?.length || 0,
        prerequisitesGenerated: materials.prerequisites?.length || 0,
        mindMapNodesGenerated: materials.mindMap?.nodes?.length || 0,
        mindMapEdgesGenerated: materials.mindMap?.edges?.length || 0,
        retriedBy: 'trigger-task',
      },
    });
    console.log(`✅ [RETRY] Activity logged for ${video.videoId}`);
  } catch (activityError) {
    console.warn(`⚠️ [RETRY] Failed to log activity (non-critical):`, activityError);
  }
}

// ─── Helper: Log costs for retry ─────────────────────────────────────────────

async function logRetryCosts(
  video: VideoDocument,
  services: IServiceUsage[]
) {
  try {
    if (services.length === 0) return;

    const totalCost = calculateTotalCost(services);
    await logGenerationCost({
      userId: video.userId,
      source: CostSource.LEARNING_MATERIAL_GENERATION,
      sourceId: video._id,
      services,
      totalCost,
    });
    console.log(`💰 [RETRY] Cost logged: ${formatCost(totalCost)} total`);
  } catch (costError) {
    console.warn(`⚠️ [RETRY] Failed to log costs (non-critical):`, costError);
  }
}

/**
 * Process a video using chunked generation (for long videos / token limit errors)
 */
export async function processVideoChunked(video: VideoDocument) {
  console.log(`🔧 [RETRY] Starting chunked generation for ${video.videoId}`);
  console.log(`📋 [RETRY] Incomplete materials: ${video.incompleteMaterials?.join(', ') || 'all'}`);

  const services: IServiceUsage[] = [];

  // Get transcript from SourceContent or Video
  const transcript = await getTranscriptText(video);

  // Detect placeholder metadata from previous failed runs
  const hasPlaceholderMetadata =
    video.title === 'Video Title' ||
    video.title?.startsWith('Video ') ||
    video.summary === 'Summary unavailable';

  let materialsToRetry = video.incompleteMaterials || [];
  if (hasPlaceholderMetadata && !materialsToRetry.includes('metadata')) {
    materialsToRetry = ['metadata', ...materialsToRetry];
    console.log('🔍 [RETRY] Detected placeholder metadata - adding to retry list');
  }

  // Generate materials in chunks
  const chunkedResult = await generateLearningMaterialsChunked(
    transcript,
    materialsToRetry.length > 0 ? materialsToRetry : undefined
  );

  // Track LLM cost
  if (chunkedResult.usage) {
    const llmCost = calculateLLMCost(
      chunkedResult.usage.promptTokens,
      chunkedResult.usage.completionTokens,
      GEMINI_MODEL_NAME
    );
    services.push({
      service: ServiceType.GEMINI_LLM,
      usage: {
        cost: llmCost,
        unitDetails: {
          inputTokens: chunkedResult.usage.promptTokens,
          outputTokens: chunkedResult.usage.completionTokens,
          totalTokens: chunkedResult.usage.totalTokens,
          metadata: {
            method: 'chunked',
            retriedBy: 'trigger-task',
            materialsRetried: materialsToRetry,
          },
        },
      },
      status: 'success',
    });
    console.log(`💰 [RETRY] LLM cost: ${formatCost(llmCost)}`);
  }

  // Transform problem IDs
  if (chunkedResult.materials.realWorldProblems && chunkedResult.materials.realWorldProblems.length > 0) {
    chunkedResult.materials.realWorldProblems = chunkedResult.materials.realWorldProblems.map(
      (problem, index: number) => ({
        ...problem,
        id: `${video.videoId}-problem-${index + 1}`,
      })
    );
  }

  // Save materials to database
  await saveVideoMaterials(video, chunkedResult.materials, !chunkedResult.incompleteMaterials.includes('metadata'));

  // Determine incomplete materials
  const incompleteMaterialsList: string[] = [...chunkedResult.incompleteMaterials];

  // Generate embedding
  const embedding = await generateVideoEmbedding(video, chunkedResult.materials, transcript);

  if (incompleteMaterialsList.length === 0) {
    // Complete success — update both Video + Source
    await updateDualStatus(video, {
      processingStatus: 'completed',
      materialsStatus: 'complete',
      incompleteMaterials: [],
      embedding,
      errorType: null,
      errorMessage: null,
      processedAt: new Date(),
    });

    // Log activity + costs
    await logRetryActivity(video, chunkedResult.materials);
    await logRetryCosts(video, services);

    console.log(`✅ [RETRY] Video ${video.videoId} completed (chunked)`);
    return { success: true, videoId: video.videoId, method: 'chunked' };
  } else {
    // Partial success — still has incomplete materials
    await updateDualStatus(video, {
      processingStatus: 'completed_with_warning',
      materialsStatus: 'incomplete',
      incompleteMaterials: incompleteMaterialsList,
      embedding,
    });

    // Still log costs even on partial success
    await logRetryCosts(video, services);

    console.log(`⚠️ [RETRY] Video ${video.videoId} partially completed. Incomplete: ${incompleteMaterialsList.join(', ')}`);
    return {
      success: false,
      videoId: video.videoId,
      method: 'chunked',
      incompleteMaterials: incompleteMaterialsList,
    };
  }
}

/**
 * Process a video using standard retry (for transient errors or validation overrides)
 */
export async function processVideoStandard(video: VideoDocument) {
  console.log(`🔄 [RETRY] Standard retry for ${video.videoId}`);

  const services: IServiceUsage[] = [];

  // Import dynamically to avoid circular dependencies if any
  const { generateLearningMaterials } = await import('./llm');

  // Get transcript from SourceContent or Video
  const transcript = await getTranscriptText(video);
  console.log(`📝 [RETRY] Transcript length: ${transcript.length} characters`);

  try {
    // Generate materials using standard approach
    const llmResponse = await generateLearningMaterials(transcript);
    const { materials, usage } = llmResponse;

    // Track LLM cost
    const llmCost = calculateLLMCost(usage.promptTokens, usage.completionTokens, GEMINI_MODEL_NAME);
    services.push({
      service: ServiceType.GEMINI_LLM,
      usage: {
        cost: llmCost,
        unitDetails: {
          inputTokens: usage.promptTokens,
          outputTokens: usage.completionTokens,
          totalTokens: usage.totalTokens,
          metadata: {
            method: 'standard',
            retriedBy: 'trigger-task',
            flashcardsGenerated: materials.flashcards.length,
            quizzesGenerated: materials.quizzes.length,
            chaptersGenerated: materials.chapters.length,
          },
        },
      },
      status: 'success',
    });
    console.log(`💰 [RETRY] LLM cost: ${formatCost(llmCost)}`);

    // Transform problem IDs
    if (materials.realWorldProblems && materials.realWorldProblems.length > 0) {
      materials.realWorldProblems = materials.realWorldProblems.map(
        (problem: { id: string; title: string; scenario: string; hints: string[] }, index: number) => ({
          ...problem,
          id: `${video.videoId}-problem-${index + 1}`,
        })
      );
    }

    // Save materials
    await saveVideoMaterials(video, materials, true);

    // Generate embedding
    const embedding = await generateVideoEmbedding(video, materials, transcript);

    // Mark as complete — update both Video + Source
    await updateDualStatus(video, {
      title: materials.title,
      category: materials.category,
      tags: materials.tags,
      summary: materials.videoSummary,
      embedding,
      processingStatus: 'completed',
      materialsStatus: 'complete',
      incompleteMaterials: [],
      errorType: null,
      errorMessage: null,
      processedAt: new Date(),
    });

    // Log activity + costs
    await logRetryActivity(video, materials);
    await logRetryCosts(video, services);

    console.log(`✅ [RETRY] Video ${video.videoId} standard retry succeeded!`);
    return { success: true, videoId: video.videoId, method: 'standard' };

  } catch (error) {
    console.error(`❌ [RETRY] Standard retry failed for ${video.videoId}:`, error);

    // Log cost even on failure (we still consumed LLM tokens)
    await logRetryCosts(video, services);

    throw error; // Re-throw to be handled by the caller
  }
}

/**
 * Save generated materials to database
 * @param metadataWasGenerated - If true, update video metadata fields. If false, skip to avoid overwriting with placeholders.
 */
async function saveVideoMaterials(video: VideoDocument, materials: LearningMaterials, metadataWasGenerated: boolean = true) {
  // Save flashcards
  if (materials.flashcards && materials.flashcards.length > 0) {
    await Flashcard.deleteMany({ sourceId: video.videoId });
    await Flashcard.insertMany(
      materials.flashcards.map((card) => ({
        ...card,
        sourceId: video.videoId,
        userId: video.userId,
        generationType: 'ai',
        difficulty: (card as Record<string, unknown>).difficulty || 'medium',
      }))
    );
  }

  // Save quizzes
  if (materials.quizzes && materials.quizzes.length > 0) {
    await Quiz.deleteMany({ sourceId: video.videoId });
    await Quiz.insertMany(
      materials.quizzes.map((quiz) => ({
        ...quiz,
        sourceId: video.videoId,
        userId: video.userId,
        generationType: 'ai',
        difficulty: (quiz as Record<string, unknown>).difficulty || 'medium',
      }))
    );
  }

  // Save learning materials (prerequisites + case studies)
  if (
    (materials.prerequisites && materials.prerequisites.length > 0) ||
    (materials.realWorldProblems && materials.realWorldProblems.length > 0)
  ) {
    await LearningMaterial.deleteMany({ sourceId: video.videoId });
    await LearningMaterial.create({
      sourceId: video.videoId,
      userId: video.userId,
      prerequisites: materials.prerequisites || [],
      realWorldProblems: materials.realWorldProblems || [],
      summary: materials.videoSummary || '',
      metadata: {
        generatedBy: 'retry-task',
        generatedAt: new Date(),
      },
    });
  }

  // Save mind map
  if (materials.mindMap && materials.mindMap.nodes && materials.mindMap.nodes.length > 0) {
    await MindMap.deleteMany({ sourceId: video.videoId });
    await MindMap.create({
      sourceId: video.videoId,
      userId: video.userId,
      nodes: materials.mindMap.nodes,
      edges: materials.mindMap.edges || [],
      metadata: {
        generatedBy: 'retry-task',
        generatedAt: new Date(),
      },
    });
  }

  // Update video + source metadata ONLY if it was actually generated
  if (metadataWasGenerated) {
    const metadataPayload = {
      title: materials.title,
      category: materials.category,
      tags: materials.tags,
      summary: materials.videoSummary,
      chapters: materials.chapters || [],
    };
    await Video.findByIdAndUpdate(video._id, metadataPayload);
    await Source.findOneAndUpdate(
      { userId: video.userId, sourceId: video.videoId },
      metadataPayload
    );
    console.log(`📝 [RETRY] Updated metadata on Video + Source (title: ${materials.title})`);
  } else {
    console.log(`⏭️  [RETRY] Skipped metadata update - using existing values`);
  }
}
