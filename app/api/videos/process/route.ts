import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import dbConnect from '@/lib/mongodb';
import Video from '@/lib/models/Video';
import Source from '@/lib/models/Source';
import SourceContent from '@/lib/models/SourceContent';
import LearningMaterial from '@/lib/models/LearningMaterial';
import Flashcard from '@/lib/models/Flashcard';
import Quiz from '@/lib/models/Quiz';
import { MindMap, ServiceType } from '@/lib/models';
import ActivityLog from '@/lib/models/ActivityLog';
import { extractVideoId, isValidYouTubeUrl } from '@/lib/transcript';
import { getExtractor } from '@/lib/extractors';
import { generateLearningMaterials } from '@/lib/llm';
import { generateEmbeddings } from '@/lib/embedding';
import { GEMINI_MODEL_NAME } from '@/lib/sdk';
import { resolveClientDay } from '@/lib/date.utils';
import { calculateLLMCost, calculateApifyCost, getCurrentModelInfo } from '@/lib/cost/calculator';
import { logGenerationCost, calculateTotalCost, formatCost } from '@/lib/cost/logger';
import type { IServiceUsage } from '@/lib/models/Cost';
import { CostSource } from '@/lib/models/Cost';
import { ApiError, InvalidURLError, DuplicateVideoError } from '@/lib/errors/ApiError';
import type { ExtractedSegment } from '@/lib/extractors/types';

interface DecodedToken {
  userId: string;
  username: string;
  firstName: string;
  lastName: string;
  iat: number;
  exp: number;
}

// ─── Helper: Authenticate request ───────────────────────────────────────────

function authenticate(request: NextRequest): DecodedToken {
  const token = request.cookies.get('jwt')?.value;
  if (!token) {
    throw Object.assign(new Error('Unauthorized'), { statusCode: 401 });
  }
  return jwt.verify(token, process.env.JWT_SECRET!) as DecodedToken;
}

// ─── Helper: Extract content from YouTube ───────────────────────────────────

async function extractContent(youtubeUrl: string, services: IServiceUsage[]) {
  const extractStartTime = Date.now();
  const extractor = getExtractor('youtube');
  const extraction = await extractor({ sourceType: 'youtube', sourceUrl: youtubeUrl });
  const extractDuration = Date.now() - extractStartTime;

  if (!extraction.success) {
    return { success: false as const, error: extraction.error };
  }

  // Track extraction cost
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

  return { success: true as const, extraction, extractDuration };
}

// ─── Helper: Save extraction to database (Video + Source + SourceContent) ────

async function saveExtraction(
  userId: string,
  videoDocId: string,
  videoId: string,
  youtubeUrl: string,
  extraction: { text: string; segments?: ExtractedSegment[]; metadata: { duration?: number; wordCount: number; sourceId: string; language?: string } }
) {
  const { segments = [], metadata } = extraction;
  const { duration: totalDuration, sourceId: extractedSourceId } = metadata;

  // Update Video doc (backward compat)
  await Video.findByIdAndUpdate(videoDocId, {
    transcript: segments.map((seg) => ({
      text: seg.text,
      offset: seg.startTime || 0,
      duration: (seg.endTime || 0) - (seg.startTime || 0),
      lang: 'en',
    })),
    duration: totalDuration || 0,
    thumbnail: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
    channelName: 'YouTube',
    title: `Video ${videoId}`,
  });

  // Create Source doc (new schema)
  await Source.findOneAndUpdate(
    { userId, sourceId: extractedSourceId },
    {
      userId,
      sourceId: extractedSourceId,
      sourceType: 'youtube',
      sourceUrl: youtubeUrl,
      title: `Video ${videoId}`,
      thumbnail: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
      channelName: 'YouTube',
      duration: totalDuration || 0,
      language: metadata.language || 'en',
      processingStatus: 'processing',
      materialsStatus: 'generating',
    },
    { upsert: true, new: true }
  );

  // Create SourceContent doc (new schema)
  await SourceContent.findOneAndUpdate(
    { sourceId: extractedSourceId, userId },
    {
      sourceId: extractedSourceId,
      userId,
      fullText: extraction.text,
      wordCount: metadata.wordCount,
      segments: segments.map((seg) => ({
        text: seg.text,
        startTime: seg.startTime,
        endTime: seg.endTime,
        lang: metadata.language || 'en',
      })),
    },
    { upsert: true, new: true }
  );

  console.log('✅ [VIDEO PROCESS] Extraction saved (Video + Source + SourceContent)');
}

// ─── Helper: Validate educational content ───────────────────────────────────

async function validateContent(
  text: string,
  userId: string,
  videoId: string,
  videoDocId: string,
  services: IServiceUsage[]
): Promise<{ rejected: boolean; response?: NextResponse }> {
  if (process.env.ENABLE_CONTENT_VALIDATION !== 'true') {
    console.log('⏭️ [VIDEO PROCESS] Content validation disabled, skipping...');
    return { rejected: false };
  }

  try {
    const { validateEducationalContent, logValidationDecision } = await import('@/lib/content-validator');
    const { NonEducationalContentError } = await import('@/lib/errors/ApiError');

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

      const error = new NonEducationalContentError(validation.reason);
      return {
        rejected: true,
        response: NextResponse.json(
          {
            error: error.message,
            errorType: error.code,
            details: validation.reason,
            confidence: validation.confidence,
            videoId: videoDocId,
          },
          { status: error.statusCode }
        ),
      };
    }

    console.log(`✅ [VIDEO PROCESS] Educational content validated (confidence: ${validation.confidence})`);
    return { rejected: false };
  } catch (validationError) {
    console.error('⚠️ [VIDEO PROCESS] Content validation failed (non-critical):', validationError);
    return { rejected: false }; // Fail-open
  }
}

// ─── Helper: Generate materials via LLM ─────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function generateMaterials(transcriptText: string, videoId: string, services: IServiceUsage[]): Promise<{ materials: any; usage: any } | { error: unknown; errorCode: string }> {
  const modelInfo = getCurrentModelInfo(GEMINI_MODEL_NAME);
  console.log(`🤖 [VIDEO PROCESS] Using model: ${modelInfo.model}`);

  try {
    const llmResponse = await generateLearningMaterials(transcriptText);
    const { materials, usage } = llmResponse;

    // Transform problem IDs to be globally unique (prevent cross-video contamination)
    if (materials.realWorldProblems?.length > 0) {
      materials.realWorldProblems = materials.realWorldProblems.map((problem: { id: string }) => ({
        ...problem,
        id: `${videoId}_${problem.id}`,
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
async function saveLearningMaterials(userId: string, videoId: string, materials: any) {
  const modelInfo = getCurrentModelInfo(GEMINI_MODEL_NAME);

  await Flashcard.insertMany(
    materials.flashcards.map((fc: { question: string; answer: string; difficulty: string }) => ({
      userId,
      sourceId: videoId,
      question: fc.question,
      answer: fc.answer,
      difficulty: fc.difficulty,
      generationType: 'ai',
    }))
  );

  await Quiz.insertMany(
    materials.quizzes.map((quiz: { questionText: string; options: string[]; correctAnswerIndex: number; explanation: string }) => ({
      userId,
      sourceId: videoId,
      questionText: quiz.questionText,
      options: quiz.options,
      correctAnswerIndex: quiz.correctAnswerIndex,
      explanation: quiz.explanation,
      difficulty: 'medium',
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
    summary: materials.videoSummary,
    metadata: { generatedBy: modelInfo.model, generatedAt: new Date() },
  });

  console.log('✅ [VIDEO PROCESS] All learning materials saved');
}

// ─── Helper: Update final status (Video + Source) ───────────────────────────

async function updateFinalStatus(
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
      title: `Video ${videoId}`,
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
      Summary: ${materials.videoSummary}
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
    summary: materials.videoSummary,
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

async function logActivity(
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

async function logCosts(userId: string, videoDocId: string, services: IServiceUsage[]) {
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

// ═══════════════════════════════════════════════════════════════════════════════
// POST /api/videos/process — Main pipeline
// ═══════════════════════════════════════════════════════════════════════════════

export async function POST(request: NextRequest) {
  console.log('🚀 [VIDEO PROCESS] Starting video processing pipeline...');

  try {
    // 1. Authenticate
    const decoded = authenticate(request);
    console.log(`✅ [VIDEO PROCESS] Authenticated: ${decoded.userId}`);

    // 2. Parse & validate request
    const { youtubeUrl, clientTimestamp, timezoneOffsetMinutes, timeZone } = await request.json();
    if (!youtubeUrl || typeof youtubeUrl !== 'string') {
      return NextResponse.json({ error: 'YouTube URL is required' }, { status: 400 });
    }

    if (!isValidYouTubeUrl(youtubeUrl)) {
      const err = new InvalidURLError();
      return NextResponse.json({ error: err.message, errorType: err.code }, { status: err.statusCode });
    }

    await dbConnect();
    const videoId = extractVideoId(youtubeUrl);

    // 3. Check for duplicates
    const existingVideo = await Video.findOne({ userId: decoded.userId, videoId });
    if (existingVideo) {
      const err = new DuplicateVideoError();
      return NextResponse.json(
        { error: err.message, errorType: err.code, videoId: existingVideo.videoId },
        { status: err.statusCode }
      );
    }

    // 4. Create initial video record
    const videoDoc = await Video.create({
      userId: decoded.userId,
      youtubeUrl,
      videoId,
      title: 'Processing...',
      processingStatus: 'processing',
      transcript: [],
      language: 'en',
    });
    const videoDocId = videoDoc._id.toString();

    // 5. Extract content
    const services: IServiceUsage[] = [];
    const extractResult = await extractContent(youtubeUrl, services);

    if (!extractResult.success) {
      await Video.findByIdAndUpdate(videoDocId, {
        processingStatus: 'failed',
        errorType: extractResult.error.code,
        errorMessage: `Extraction failed: ${extractResult.error.message}`,
      });
      return NextResponse.json(
        { error: extractResult.error.message, errorType: extractResult.error.code },
        { status: 500 }
      );
    }

    const { extraction } = extractResult;

    // 6. Save extraction to DB (Video + Source + SourceContent)
    await saveExtraction(decoded.userId, videoDocId, videoId, youtubeUrl, extraction);

    // 7. Validate educational content (if enabled)
    const validation = await validateContent(extraction.text, decoded.userId, videoId, videoDocId, services);
    if (validation.rejected) {
      return validation.response!;
    }

    // 8. Generate learning materials via LLM
    const llmResult = await generateMaterials(extraction.text, videoId, services);

    let materials = null;
    let llmError: unknown = null;
    let llmErrorCode: string | null = null;

    if ('error' in llmResult) {
      llmError = llmResult.error;
      llmErrorCode = llmResult.errorCode;
    } else {
      materials = llmResult.materials;
    }

    // 9. Save learning materials (if LLM succeeded)
    if (materials) {
      await saveLearningMaterials(decoded.userId, videoId, materials);
    }

    // 10. Update final status (Video + Source)
    await updateFinalStatus(decoded.userId, videoDocId, videoId, extraction.text, materials, llmError, llmErrorCode);

    // 11. Log activity (if materials generated)
    if (materials) {
      await logActivity(decoded.userId, videoId, materials, clientTimestamp, timezoneOffsetMinutes, timeZone);
    }

    // 12. Log costs
    await logCosts(decoded.userId, videoDocId, services);

    // 13. Return response
    if (llmError) {
      return NextResponse.json({
        success: true,
        videoId,
        warning: {
          type: llmErrorCode,
          message: llmError instanceof Error ? llmError.message : 'Some materials could not be generated',
        },
      }, { status: 200 });
    }

    console.log(`🎉 [VIDEO PROCESS] Pipeline completed! Video ID: ${videoId}`);
    return NextResponse.json({
      success: true,
      videoId,
      message: 'Video processed successfully',
    }, { status: 201 });

  } catch (error) {
    console.error('💥 [VIDEO PROCESS] FATAL ERROR:', error);

    let errorCode = 'UNKNOWN_ERROR';
    let statusCode = 500;
    let errorMessage = 'Internal server error';

    if (error instanceof ApiError) {
      errorCode = error.code;
      statusCode = error.statusCode;
      errorMessage = error.message;
    } else if (error instanceof Error) {
      if ('statusCode' in error && (error as { statusCode: number }).statusCode === 401) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      errorMessage = error.message;
    }

    return NextResponse.json(
      { error: errorMessage, errorType: errorCode },
      { status: statusCode }
    );
  }
}
