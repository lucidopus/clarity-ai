/**
 * Shared pipeline helper functions for video processing.
 *
 * These are pure async functions with NO HTTP context dependencies,
 * used by both the API route (for validation) and the Trigger.dev
 * pipeline task (for background processing).
 */

import Video from '@/lib/models/Video';
import Source from '@/lib/models/Source';
import SourceContent from '@/lib/models/SourceContent';
import LearningMaterial from '@/lib/models/LearningMaterial';
import Flashcard from '@/lib/models/Flashcard';
import Quiz from '@/lib/models/Quiz';
import { MindMap, ServiceType } from '@/lib/models';
import ActivityLog from '@/lib/models/ActivityLog';
import { getExtractor } from '@/lib/extractors';
import type { ExtractorInput } from '@/lib/extractors';
import { generateLearningMaterials } from '@/lib/llm';
import type { LearnerContext } from '@/lib/prompts';
import type { SourceType } from '@/lib/models/Source';
import { generateEmbeddings } from '@/lib/embedding';
import { GEMINI_MODEL_NAME } from '@/lib/sdk';
import { resolveClientDay } from '@/lib/date.utils';
import { calculateLLMCost, calculateApifyCost, getCurrentModelInfo } from '@/lib/cost/calculator';
import { logGenerationCost, calculateTotalCost, formatCost } from '@/lib/cost/logger';
import type { IServiceUsage } from '@/lib/models/Cost';
import { CostSource } from '@/lib/models/Cost';
import { ApiError } from '@/lib/errors/ApiError';
import type { ExtractedSegment } from '@/lib/extractors/types';

// ─── Helper: Extract content from any source ────────────────────────────────

export async function extractContent(input: ExtractorInput, services: IServiceUsage[]) {
  const extractStartTime = Date.now();
  const extractor = getExtractor(input.sourceType);
  const extraction = await extractor(input);
  const extractDuration = Date.now() - extractStartTime;

  if (!extraction.success) {
    return { success: false as const, error: extraction.error };
  }

  // Track extraction cost (varies by source type)
  if (input.sourceType === 'youtube') {
    const apifyCost = calculateApifyCost();
    services.push({
      service: ServiceType.APIFY_TRANSCRIPT,
      usage: {
        cost: apifyCost,
        unitDetails: {
          duration: extractDuration,
          metadata: {
            segmentCount: extraction.segments?.length || 0,
            characterCount: extraction.text.length,
            wordCount: extraction.metadata.wordCount,
          },
        },
      },
      status: 'success',
    });
    console.log(`💰 [COST] Extraction: ${formatCost(apifyCost)} (${extractDuration}ms)`);
  } else {
    // Text, document, etc. — no extraction cost, just log metadata
    console.log(`📝 [EXTRACT] ${input.sourceType} content extracted (${extraction.metadata.wordCount} words, ${extractDuration}ms)`);
  }

  return { success: true as const, extraction, extractDuration };
}

// ─── Helper: Save extraction to database (Video + Source + SourceContent) ────

export async function saveExtraction(
  userId: string,
  videoDocId: string,
  sourceId: string,
  sourceType: SourceType,
  extraction: {
    text: string;
    title?: string;
    segments?: ExtractedSegment[];
    metadata: { duration?: number; wordCount: number; sourceId: string; language?: string; fileName?: string; fileSize?: number; mimeType?: string };
  },
  sourceMetadata?: { sourceUrl?: string; fileUrl?: string }
) {
  const { segments = [], metadata } = extraction;
  const { duration: totalDuration } = metadata;

  // Always use the sourceId passed in — extractors may generate their own, but we need consistency
  // with the Video.allSourceIds array
  const isYouTube = sourceType === 'youtube';
  const title = extraction.title || metadata.fileName || `Content ${sourceId}`;
  const thumbnail = isYouTube ? `https://img.youtube.com/vi/${sourceId}/hqdefault.jpg` : undefined;

  // Update Video doc (backward compat)
  const videoUpdate: Record<string, unknown> = {
    duration: totalDuration || 0,
    title,
  };
  if (isYouTube) {
    videoUpdate.transcript = segments.map((seg) => ({
      text: seg.text,
      offset: seg.startTime || 0,
      duration: (seg.endTime || 0) - (seg.startTime || 0),
      lang: 'en',
    }));
    videoUpdate.thumbnail = thumbnail;
    videoUpdate.channelName = 'YouTube';
  }
  await Video.findByIdAndUpdate(videoDocId, videoUpdate);

  // Create/update Source doc
  const sourceDoc: Record<string, unknown> = {
    userId,
    sourceId: sourceId,
    sourceType,
    title,
    duration: totalDuration || 0,
    language: metadata.language || 'en',
    processingStatus: 'processing',
    materialsStatus: 'generating',
  };
  if (isYouTube) {
    sourceDoc.sourceUrl = sourceMetadata?.sourceUrl;
    sourceDoc.thumbnail = thumbnail;
    sourceDoc.channelName = 'YouTube';
  }
  if (sourceType === 'document' || sourceType === 'audio') {
    sourceDoc.fileUrl = sourceMetadata?.fileUrl || sourceMetadata?.sourceUrl;
  }
  if (metadata.fileName) sourceDoc.fileName = metadata.fileName;
  if (metadata.fileSize) sourceDoc.fileSize = metadata.fileSize;
  if (metadata.mimeType) sourceDoc.mimeType = metadata.mimeType;

  await Source.findOneAndUpdate(
    { userId, sourceId: sourceId },
    sourceDoc,
    { upsert: true, new: true }
  );

  // Create/update SourceContent doc
  await SourceContent.findOneAndUpdate(
    { sourceId: sourceId, userId },
    {
      sourceId: sourceId,
      userId,
      fullText: extraction.text,
      wordCount: metadata.wordCount,
      segments: segments.map((seg) => ({
        text: seg.text,
        startTime: seg.startTime,
        endTime: seg.endTime,
        page: seg.page,
        lang: metadata.language || 'en',
      })),
    },
    { upsert: true, new: true }
  );

  console.log(`✅ [PIPELINE] Extraction saved (Video + Source + SourceContent) [${sourceType}]`);
}

// ─── Helper: Validate educational content ───────────────────────────────────

/**
 * Validates that content is educational. On rejection, handles DB updates
 * and cost logging internally so callers just check `rejected`.
 */
export async function validateContent(
  text: string,
  userId: string,
  videoId: string,
  videoDocId: string,
  services: IServiceUsage[]
): Promise<{ rejected: boolean; reason?: string }> {
  if (process.env.ENABLE_CONTENT_VALIDATION !== 'true') {
    console.log('⏭️ [VIDEO PROCESS] Content validation disabled, skipping...');
    return { rejected: false };
  }

  try {
    const { validateEducationalContent, logValidationDecision } = await import('@/lib/content-validator');

    const validationStartTime = Date.now();
    const validation = await validateEducationalContent(text);
    const validationDuration = Date.now() - validationStartTime;

    await logValidationDecision({
      userId,
      videoId,
      validation,
      snippetLength: Math.min(text.length, 2000),
      model: process.env.CONTENT_VALIDATION_MODEL || 'gemini-2.0-flash-exp',
    });

    // Track validation cost
    const validationCost = calculateLLMCost(
      validation.usage.promptTokens,
      validation.usage.completionTokens,
      process.env.CONTENT_VALIDATION_MODEL || 'gemini-2.0-flash-exp'
    );
    services.push({
      service: ServiceType.CONTENT_VALIDATION,
      usage: {
        cost: validationCost,
        unitDetails: {
          inputTokens: validation.usage.promptTokens,
          outputTokens: validation.usage.completionTokens,
          duration: validationDuration,
          metadata: {
            confidence: validation.confidence,
            reason: validation.reason,
            suggestedCategory: validation.suggestedCategory,
          },
        },
      },
      status: validation.isEducational ? 'success' : 'rejected',
    });

    if (!validation.isEducational) {
      console.log(`❌ [VIDEO PROCESS] Non-educational content: ${validation.reason}`);

      // Log costs before rejecting
      const totalCost = calculateTotalCost(services);
      await logGenerationCost({
        userId,
        source: CostSource.LEARNING_MATERIAL_GENERATION,
        videoId: videoDocId,
        services,
        totalCost,
      });

      // Update video + source status
      const rejectionPayload = {
        processingStatus: 'validation_rejected',
        errorType: 'NON_EDUCATIONAL_CONTENT',
        errorMessage: validation.reason,
      };
      await Video.findByIdAndUpdate(videoDocId, rejectionPayload);
      await Source.findOneAndUpdate({ userId, sourceId: videoId }, rejectionPayload);

      return { rejected: true, reason: validation.reason };
    }

    console.log(`✅ [VIDEO PROCESS] Educational content validated (confidence: ${validation.confidence})`);
    return { rejected: false };
  } catch (validationError) {
    console.error('⚠️ [VIDEO PROCESS] Content validation failed (non-critical):', validationError);
    return { rejected: false }; // Fail-open
  }
}

// ─── Helper: Generate materials via LLM ─────────────────────────────────────

export async function generateMaterials(
  contentText: string,
  sourceId: string,
  services: IServiceUsage[],
  options?: { sourceType?: SourceType; hasTimestamps?: boolean; sourceDescription?: string; learnerContext?: LearnerContext }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<{ materials: any; usage: any } | { error: unknown; errorCode: string }> {
  const modelInfo = getCurrentModelInfo(GEMINI_MODEL_NAME);
  console.log(`🤖 [VIDEO PROCESS] Using model: ${modelInfo.model}`);

  try {
    const llmResponse = await generateLearningMaterials(contentText, {
      hasTimestamps: options?.hasTimestamps ?? true,
      sourceDescription: options?.sourceDescription ?? 'educational content',
      learnerContext: options?.learnerContext,
    });
    const { materials, usage } = llmResponse;

    // Transform problem IDs to be globally unique (prevent cross-video contamination)
    if (materials.realWorldProblems?.length > 0) {
      materials.realWorldProblems = materials.realWorldProblems.map((problem: { id: string; title: string; scenario: string; hints: string[] }) => ({
        ...problem,
        id: `${sourceId}_${problem.id}`,
      }));
    }

    console.log(`✅ [VIDEO PROCESS] Generated: ${materials.flashcards.length} flashcards, ${materials.quizzes.length} quizzes, ${materials.chapters.length} chapters`);

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
            model: modelInfo.model,
            flashcardsGenerated: materials.flashcards.length,
            quizzesGenerated: materials.quizzes.length,
            chaptersGenerated: materials.chapters.length,
            prerequisitesGenerated: materials.prerequisites.length,
            realWorldProblemsGenerated: materials.realWorldProblems.length,
            mindMapNodesGenerated: materials.mindMap.nodes.length,
            mindMapEdgesGenerated: materials.mindMap.edges.length,
          },
        },
      },
      status: 'success',
    });
    console.log(`💰 [COST] LLM: ${formatCost(llmCost)}`);

    return { materials, usage };
  } catch (error) {
    console.error('❌ [VIDEO PROCESS] LLM generation failed:', error);
    const errorCode = error instanceof ApiError ? error.code : 'LLM_PARTIAL_FAILURE';
    return { error, errorCode };
  }
}

// ─── Helper: Save learning materials to database ────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function saveLearningMaterials(userId: string, videoId: string, materials: any) {
  const modelInfo = getCurrentModelInfo(GEMINI_MODEL_NAME);

  const { initFSRSCard } = await import('@/lib/services/fsrs');
  await Flashcard.insertMany(
    materials.flashcards.map((fc: { question: string; answer: string; difficulty: string }) => ({
      userId,
      sourceId: videoId,
      question: fc.question,
      answer: fc.answer,
      difficulty: fc.difficulty,
      generationType: 'ai',
      fsrs: initFSRSCard(),
    }))
  );

  await Quiz.insertMany(
    materials.quizzes.map((quiz: { questionText: string; options: string[]; correctAnswerIndex: number; explanation: string; difficulty?: string }) => ({
      userId,
      sourceId: videoId,
      questionText: quiz.questionText,
      options: quiz.options,
      correctAnswerIndex: quiz.correctAnswerIndex,
      explanation: quiz.explanation,
      difficulty: quiz.difficulty || 'medium',
      generationType: 'ai',
    }))
  );

  await MindMap.findOneAndUpdate(
    { userId, sourceId: videoId },
    {
      userId,
      sourceId: videoId,
      nodes: materials.mindMap.nodes,
      edges: materials.mindMap.edges,
      metadata: { generatedBy: 'ai', generatedAt: new Date() },
    },
    { upsert: true, new: true }
  );

  await LearningMaterial.create({
    sourceId: videoId,
    userId,
    chapters: materials.chapters,
    prerequisites: materials.prerequisites,
    realWorldProblems: materials.realWorldProblems,
    summary: materials.summary,
    metadata: { generatedBy: modelInfo.model, generatedAt: new Date() },
  });

  console.log('✅ [VIDEO PROCESS] All learning materials saved');
}

// ─── Helper: Update final status (Video + Source) ───────────────────────────

export async function updateFinalStatus(
  userId: string,
  videoDocId: string,
  videoId: string,
  transcriptText: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  materials: any | null,
  llmError: unknown | null,
  llmErrorCode: string | null
) {
  if (llmError || !materials) {
    // Partial success — transcript available but LLM failed
    const failPayload = {
      title: `Content ${videoId}`,
      processingStatus: 'completed_with_warning' as const,
      materialsStatus: 'incomplete' as const,
      incompleteMaterials: ['metadata', 'flashcards', 'quizzes', 'prerequisites', 'mindmap', 'casestudies'],
      errorType: llmErrorCode,
      errorMessage: llmError instanceof Error ? llmError.message : 'LLM generation failed',
      processedAt: new Date(),
    };
    await Video.findByIdAndUpdate(videoDocId, failPayload);
    await Source.findOneAndUpdate({ userId, sourceId: videoId }, failPayload);
    console.log('⚠️ [VIDEO PROCESS] Marked as completed_with_warning');
    return;
  }

  // Full success — generate embedding and update
  let embedding: number[] = [];
  try {
    const embeddingContext = `
      Title: ${materials.title}
      Category: ${materials.category}
      Summary: ${materials.summary}
      Tags: ${materials.tags.join(', ')}
      Transcript Start: ${transcriptText.slice(0, 1000)}
    `.trim();

    const embeddingResult = await generateEmbeddings(embeddingContext);
    embedding = Array.isArray(embeddingResult) && Array.isArray(embeddingResult[0])
      ? (embeddingResult as number[][])[0]
      : (embeddingResult as number[]);
    console.log('✅ [VIDEO PROCESS] Embedding generated');
  } catch (embError) {
    console.error('⚠️ [VIDEO PROCESS] Embedding generation failed (non-critical):', embError);
  }

  const successPayload = {
    title: materials.title,
    category: materials.category,
    tags: materials.tags,
    summary: materials.summary,
    embedding,
    processingStatus: 'completed' as const,
    materialsStatus: 'complete' as const,
    incompleteMaterials: [] as string[],
    processedAt: new Date(),
  };
  await Video.findByIdAndUpdate(videoDocId, successPayload);
  await Source.findOneAndUpdate({ userId, sourceId: videoId }, successPayload);
  console.log('✅ [VIDEO PROCESS] Marked as completed');
}

// ─── Helper: Log activity ───────────────────────────────────────────────────

export async function logActivity(
  userId: string,
  videoId: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  materials: any,
  clientTimestamp?: string,
  timezoneOffsetMinutes?: number,
  timeZone?: string
) {
  try {
    const { now: logTimestamp, startOfDay } = resolveClientDay({ clientTimestamp, timezoneOffsetMinutes });
    await ActivityLog.create({
      userId,
      activityType: 'video_generated',
      sourceId: videoId,
      date: startOfDay,
      timestamp: logTimestamp,
      metadata: {
        flashcardsGenerated: materials.flashcards.length,
        quizzesGenerated: materials.quizzes.length,
        chaptersGenerated: materials.chapters.length,
        prerequisitesGenerated: materials.prerequisites.length,
        mindMapNodesGenerated: materials.mindMap.nodes.length,
        mindMapEdgesGenerated: materials.mindMap.edges.length,
        ...(timeZone ? { clientTimeZone: timeZone } : {}),
        ...(typeof timezoneOffsetMinutes === 'number' ? { clientTimezoneOffsetMinutes: timezoneOffsetMinutes } : {}),
      },
    });
    console.log('✅ [VIDEO PROCESS] Activity logged');
  } catch (activityError) {
    console.error('⚠️ [VIDEO PROCESS] Failed to log activity (non-critical):', activityError);
  }
}

// ─── Helper: Log costs ──────────────────────────────────────────────────────

export async function logCosts(userId: string, videoDocId: string, services: IServiceUsage[]) {
  try {
    const totalCost = calculateTotalCost(services);
    await logGenerationCost({
      userId,
      source: CostSource.LEARNING_MATERIAL_GENERATION,
      sourceId: videoDocId,
      services,
      totalCost,
    });
    console.log(`✅ [VIDEO PROCESS] Cost logged: ${formatCost(totalCost)} total`);
  } catch (costError) {
    console.error('⚠️ [VIDEO PROCESS] Failed to log costs (non-critical):', costError);
  }
}
