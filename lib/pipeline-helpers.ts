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
import { generateEmbeddingsWithUsage } from '@/lib/embedding';
import { GEMINI_MODEL_NAME } from '@/lib/sdk';
import { resolveClientDay } from '@/lib/date.utils';
import { calculateLLMCost, calculateApifyCost, getCurrentModelInfo } from '@/lib/cost/calculator';
import { logGenerationCost, calculateTotalCost, formatCost } from '@/lib/cost/logger';
import type { IServiceUsage } from '@/lib/models/Cost';
import { CostSource } from '@/lib/models/Cost';
import { WHISPER_COSTS_PER_SECOND } from '@/lib/cost/config';
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
  } else if (input.sourceType === 'audio') {
    // Audio is transcribed by Groq Whisper inside the extractor — bill per
    // second of audio returned in extraction.metadata.duration.
    const audioDuration = extraction.metadata.duration || 0;
    const perSecond = WHISPER_COSTS_PER_SECOND['whisper-large-v3'] || 0;
    const whisperCost = audioDuration > 0
      ? Math.round(audioDuration * perSecond * 1_000_000) / 1_000_000
      : 0;
    services.push({
      service: ServiceType.GROQ_WHISPER,
      usage: {
        cost: whisperCost,
        unitDetails: {
          duration: audioDuration,
          metadata: {
            model: 'whisper-large-v3',
            invoker: 'audio_extractor',
            extractLatencyMs: extractDuration,
            segmentCount: extraction.segments?.length || 0,
            wordCount: extraction.metadata.wordCount,
          },
        },
      },
      status: 'success',
    });
    console.log(`💰 [COST] Whisper (audio): ${formatCost(whisperCost)} (${audioDuration}s audio, ${extractDuration}ms wall)`);
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
): Promise<{ materials: any; usage: any; incompleteMaterials: string[] } | { error: unknown; errorCode: string }> {
  const modelInfo = getCurrentModelInfo(GEMINI_MODEL_NAME);
  console.log(`🤖 [VIDEO PROCESS] Using model: ${modelInfo.model}`);

  try {
    const llmResponse = await generateLearningMaterials(contentText, {
      hasTimestamps: options?.hasTimestamps ?? true,
      sourceDescription: options?.sourceDescription ?? 'educational content',
      learnerContext: options?.learnerContext,
    });
    const { materials, usage, incompleteMaterials } = llmResponse;

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

    // Capture per-cardType and Bloom distributions so the admin cost view
    // shows what kind of materials we're actually paying for, not just counts.
    const cardTypeBreakdown: Record<string, number> = {};
    const flashcardBloomBreakdown: Record<string, number> = {};
    for (const fc of materials.flashcards as Array<{ cardType?: string; bloomLevel?: string }>) {
      if (fc.cardType) cardTypeBreakdown[fc.cardType] = (cardTypeBreakdown[fc.cardType] || 0) + 1;
      if (fc.bloomLevel) flashcardBloomBreakdown[fc.bloomLevel] = (flashcardBloomBreakdown[fc.bloomLevel] || 0) + 1;
    }
    const quizBloomBreakdown: Record<string, number> = {};
    for (const q of materials.quizzes as Array<{ bloomLevel?: string }>) {
      if (q.bloomLevel) quizBloomBreakdown[q.bloomLevel] = (quizBloomBreakdown[q.bloomLevel] || 0) + 1;
    }
    const mindMapEdgeTypeBreakdown: Record<string, number> = {};
    for (const e of materials.mindMap.edges as Array<{ type?: string }>) {
      if (e.type) mindMapEdgeTypeBreakdown[e.type] = (mindMapEdgeTypeBreakdown[e.type] || 0) + 1;
    }

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
            cardTypeBreakdown,
            flashcardBloomBreakdown,
            quizBloomBreakdown,
            mindMapEdgeTypeBreakdown,
            incompleteMaterials,
          },
        },
      },
      status: 'success',
    });
    console.log(`💰 [COST] LLM: ${formatCost(llmCost)}`);
    if (incompleteMaterials.length > 0) {
      console.warn(`⚠️ [VIDEO PROCESS] Partial success — incomplete: ${incompleteMaterials.join(', ')}`);
    }

    return { materials, usage, incompleteMaterials };
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    materials.flashcards.map((fc: any) => ({
      userId,
      sourceId: videoId,
      question: fc.question,
      answer: fc.answer,
      difficulty: fc.difficulty,
      cardType: fc.cardType,
      bloomLevel: fc.bloomLevel,
      sourceRef: fc.sourceRef,
      generationType: 'ai',
      fsrs: initFSRSCard(),
    }))
  );

  // Quizzes now carry `richOptions` (text + isCorrect + per-distractor
  // misconception). The Mongoose model still requires the legacy `options[]`
  // and `correctAnswerIndex` for back-compat with older UI code paths, so
  // derive them here at persist time. New code should read `richOptions`.
  await Quiz.insertMany(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    materials.quizzes.map((quiz: any) => {
      const richOptions: Array<{ text: string; isCorrect: boolean; misconception?: string }> = quiz.richOptions ?? [];
      const derivedOptions = richOptions.map((o) => o.text);
      const derivedCorrectIndex = Math.max(0, richOptions.findIndex((o) => o.isCorrect));
      return {
        userId,
        sourceId: videoId,
        questionText: quiz.questionText,
        options: quiz.options ?? derivedOptions,
        correctAnswerIndex: typeof quiz.correctAnswerIndex === 'number' ? quiz.correctAnswerIndex : derivedCorrectIndex,
        richOptions,
        explanation: quiz.explanation,
        difficulty: quiz.difficulty || 'medium',
        bloomLevel: quiz.bloomLevel,
        sourceRef: quiz.sourceRef,
        generationType: 'ai',
      };
    })
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
  llmErrorCode: string | null,
  services?: IServiceUsage[],
  /**
   * Per-artifact failures from V2 (e.g., `['quizzes']` when the quiz call
   * timed out but everything else succeeded). When non-empty, the source is
   * marked `completed_with_warning` so the retry sweep can fill the gaps.
   * Empty array (or omitted) = full success.
   */
  incompleteMaterials: string[] = [],
) {
  if (llmError || !materials) {
    // Hard failure — LLM threw or returned nothing usable. Mark every artifact
    // as incomplete so the retry sweep regenerates the full set.
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
    console.log('⚠️ [VIDEO PROCESS] Marked as completed_with_warning (hard failure)');
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

    const embeddingResult = await generateEmbeddingsWithUsage(embeddingContext);
    embedding = Array.isArray(embeddingResult.vectors) && Array.isArray(embeddingResult.vectors[0])
      ? (embeddingResult.vectors as number[][])[0]
      : (embeddingResult.vectors as number[]);
    console.log(
      `✅ [VIDEO PROCESS] Embedding generated (${embeddingResult.usage.inputTokens} tokens` +
        `${embeddingResult.usage.estimated ? ', estimated' : ''}, cost ${formatCost(embeddingResult.cost)})`
    );
    services?.push({
      service: ServiceType.GEMINI_EMBEDDING,
      usage: {
        cost: embeddingResult.cost,
        unitDetails: {
          inputTokens: embeddingResult.usage.inputTokens,
          totalTokens: embeddingResult.usage.inputTokens,
          metadata: {
            model: embeddingResult.model,
            invoker: 'video_pipeline',
            estimated: embeddingResult.usage.estimated,
          },
        },
      },
      status: 'success',
    });
  } catch (embError) {
    console.error('⚠️ [VIDEO PROCESS] Embedding generation failed (non-critical):', embError);
    services?.push({
      service: ServiceType.GEMINI_EMBEDDING,
      usage: {
        cost: 0,
        unitDetails: {
          inputTokens: 0,
          metadata: { invoker: 'video_pipeline' },
        },
      },
      status: 'failed',
      errorMessage: embError instanceof Error ? embError.message : 'Embedding failed',
    });
  }

  // Partial success — at least one per-artifact call failed (e.g., quiz timeout)
  // but the rest produced data. Persist what we have, but mark the source as
  // `completed_with_warning` so `retry-failed-videos` picks it up and fills in
  // the missing artifacts. Without this branch the source would silently look
  // 100% complete and never be retried.
  const isPartial = incompleteMaterials.length > 0;
  const finalPayload = {
    title: materials.title,
    category: materials.category,
    tags: materials.tags,
    summary: materials.summary,
    embedding,
    processingStatus: (isPartial ? 'completed_with_warning' : 'completed') as 'completed' | 'completed_with_warning',
    materialsStatus: (isPartial ? 'incomplete' : 'complete') as 'complete' | 'incomplete',
    incompleteMaterials,
    ...(isPartial
      ? {
          errorType: 'PARTIAL_ARTIFACT_FAILURE',
          errorMessage: `Per-artifact failures: ${incompleteMaterials.join(', ')}`,
        }
      : {}),
    processedAt: new Date(),
  };
  await Video.findByIdAndUpdate(videoDocId, finalPayload);
  await Source.findOneAndUpdate({ userId, sourceId: videoId }, finalPayload);
  if (isPartial) {
    console.warn(`⚠️ [VIDEO PROCESS] Marked as completed_with_warning — incomplete: ${incompleteMaterials.join(', ')}`);
  } else {
    console.log('✅ [VIDEO PROCESS] Marked as completed');
  }
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
