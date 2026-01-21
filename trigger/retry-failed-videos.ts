import { task, schedules, logger } from "@trigger.dev/sdk/v3";
import mongoose from "mongoose";
import Video from "../lib/models/Video";
import Flashcard from "../lib/models/Flashcard";
import Quiz from "../lib/models/Quiz";
import LearningMaterial from "../lib/models/LearningMaterial";
import { MindMap } from "../lib/models";
import { generateLearningMaterialsChunked } from "../lib/llm";
import { generateEmbeddings } from "../lib/embedding";
import { GEMINI_MODEL_NAME } from "../lib/sdk";

/**
 * Helper: Check if error is permanent (should mark as 'failed')
 */
function isPermanentError(errorType: string): boolean {
  const permanentErrors = [
    'LLM_AUTHENTICATION',
    'LLM_PERMISSION_DENIED',
    'LLM_INVALID_REQUEST',
    'TRANSCRIPT_UNAVAILABLE',
    'LLM_CONTENT_FILTERED_SAFETY',
    'LLM_CONTENT_FILTERED_RECITATION',
  ];
  return permanentErrors.includes(errorType);
}

/**
 * Helper: Check if error requires chunked generation
 */
function isTokenLimitError(errorType: string): boolean {
  return ['LLM_TOKEN_LIMIT', 'LLM_OUTPUT_LIMIT', 'LLM_TIMEOUT'].includes(errorType);
}

/**
 * Scheduled Task: Retry Failed Videos
 * Schedule to be configured on Trigger.dev dashboard (recommended: every 6 hours)
 */
export const retryFailedVideos = schedules.task({
  id: "retry-failed-videos",
  // cron: "0 */6 * * *", // Set this on Trigger.dev dashboard instead
  maxDuration: 600, // 10 minutes
  run: async (payload) => {
    const summary = {
      timestamp: new Date().toISOString(),
      videosFound: 0,
      successfulRetries: 0,
      permanentFailures: 0,
      stillPending: 0,
      errors: [] as string[],
      breakdown: {
        chunkedGeneration: 0,
        standardRetry: 0,
        byErrorType: {} as Record<string, number>,
      }
    };

    logger.info("🔄 Starting failed video retry job...");

    try {
      // Connect to MongoDB
      if (!process.env.MONGODB_URI) {
        throw new Error("MONGODB_URI is not set");
      }

      if (mongoose.connection.readyState === 0) {
        await mongoose.connect(process.env.MONGODB_URI);
        logger.info("✅ Connected to MongoDB");
      }

      // Query videos needing retry
      const videos = await Video.find({
        processingStatus: 'completed_with_warning'
      });

      summary.videosFound = videos.length;
      logger.info(`📊 Found ${videos.length} videos to retry`);

      // Process each video
      for (const video of videos) {
        try {
          const errorType = video.errorType || 'UNKNOWN';

          // Track error type distribution
          summary.breakdown.byErrorType[errorType] =
            (summary.breakdown.byErrorType[errorType] || 0) + 1;

          // CATEGORY 3: Permanent failures - mark as 'failed'
          if (isPermanentError(errorType)) {
            await Video.findByIdAndUpdate(video._id, {
              processingStatus: 'failed',
              // Keep errorType and errorMessage for debugging
            });
            summary.permanentFailures++;
            logger.info(`❌ Marked video ${video.videoId} as failed (${errorType})`);
            continue;
          }

          // CATEGORY 2: Token limit errors - use chunked generation
          if (isTokenLimitError(errorType)) {
            await processVideoChunked(video, summary);
            continue;
          }

          // CATEGORY 1: Transient errors - retry with standard approach
          await processVideoStandard(video, summary);

        } catch (error) {
          // ⚠️ CRITICAL: If anything goes wrong processing this video,
          // DO NOT mark it as failed. Leave it as 'completed_with_warning'
          // so the next cron run can try again.
          summary.stillPending++;
          const errorMsg = error instanceof Error ? error.message : 'Unknown error';
          summary.errors.push(`${video.videoId}: ${errorMsg}`);
          logger.error(`⚠️ Error processing video ${video.videoId}:`, error as Record<string, unknown>);
          logger.warn(`Leaving video as 'completed_with_warning' for next cron retry`);
          // Continue to next video, don't crash the entire job
        }
      }

    } catch (error) {
      logger.error("💥 Fatal error in retry job:", error as Record<string, unknown>);
      summary.errors.push(`FATAL: ${error instanceof Error ? error.message : 'Unknown'}`);
    }

    // Log final summary
    logger.info("✅ Retry job complete!", {
      found: summary.videosFound,
      success: summary.successfulRetries,
      failed: summary.permanentFailures,
      pending: summary.stillPending,
    });

    // Return structured summary (visible in Trigger.dev dashboard)
    return summary;
  }
});

/**
 * Process video with chunked generation
 */
async function processVideoChunked(video: any, summary: any) {
  try {
    logger.info(`🔧 Starting chunked generation for ${video.videoId}`);
    logger.info(`📋 Incomplete materials: ${video.incompleteMaterials?.join(', ') || 'all'}`);

    // Get transcript
    const transcript = video.transcript.map((s: any) => s.text).join(' ');

    // Generate materials in chunks - pass incompleteMaterials for selective retry
    const chunkedResult = await generateLearningMaterialsChunked(
      transcript,
      video.incompleteMaterials || undefined
    );

    // Transform problem IDs to include videoId prefix
    if (chunkedResult.materials.realWorldProblems && chunkedResult.materials.realWorldProblems.length > 0) {
      chunkedResult.materials.realWorldProblems = chunkedResult.materials.realWorldProblems.map(problem => ({
        ...problem,
        id: `${video.videoId}_${problem.id}`
      }));
    }

    // Save materials to database
    await saveVideoMaterials(video, chunkedResult.materials);

    // Determine incompleteMaterials for tracking
    // NOTE: Only track materials that FAILED generation, not those that were SKIPPED
    // Skipped materials return empty arrays but already exist in the database
    const incompleteMaterialsList: string[] = [...chunkedResult.incompleteMaterials];

    // Update video status
    if (incompleteMaterialsList.length === 0) {
      // ✅ Complete success - generate embedding if missing
      let embedding: number[] = video.embedding || [];
      
      // Only generate embedding if it doesn't exist
      if (!video.embedding || video.embedding.length === 0) {
        logger.info(`🧠 Generating embedding for ${video.videoId}...`);
        try {
          const transcript = video.transcript.map((s: any) => s.text).join(' ');
          const transcriptSnippet = transcript.slice(0, 1000);
          const embeddingContext = `
            Title: ${chunkedResult.materials.title}
            Category: ${chunkedResult.materials.category}
            Summary: ${chunkedResult.materials.videoSummary}
            Tags: ${chunkedResult.materials.tags.join(', ')}
            Transcript Start: ${transcriptSnippet}
          `.trim();
          
          const embeddingResult = await generateEmbeddings(embeddingContext);
          embedding = Array.isArray(embeddingResult) && Array.isArray(embeddingResult[0]) 
            ? (embeddingResult as number[][])[0] 
            : (embeddingResult as number[]);
            
          logger.info(`✅ Generated 1536d embedding for ${video.videoId}`);
        } catch (embError) {
          logger.warn(`⚠️ Embedding generation failed (non-critical) for ${video.videoId}:`, embError as Record<string, unknown>);
        }
      } else {
        logger.info(`⏭️  Skipping embedding generation for ${video.videoId} - already exists (${video.embedding.length} dimensions)`);
      }

      await Video.findByIdAndUpdate(video._id, {
        title: chunkedResult.materials.title,
        category: chunkedResult.materials.category,
        tags: chunkedResult.materials.tags,
        summary: chunkedResult.materials.videoSummary,
        embedding: embedding,
        processingStatus: 'completed',
        materialsStatus: 'complete',
        incompleteMaterials: [],
        errorType: null,
        errorMessage: null,
        processedAt: new Date(),
      });
      summary.successfulRetries++;
      summary.breakdown.chunkedGeneration++;
      logger.info(`✅ Chunked generation succeeded completely for ${video.videoId}`);
    } else {
      // ⚠️ Partial success - some chunks failed
      await Video.findByIdAndUpdate(video._id, {
        title: chunkedResult.materials.title,
        category: chunkedResult.materials.category,
        tags: chunkedResult.materials.tags,
        summary: chunkedResult.materials.videoSummary,
        processingStatus: 'completed_with_warning',
        materialsStatus: 'incomplete',
        incompleteMaterials: incompleteMaterialsList,
        processedAt: new Date(),
      });
      summary.stillPending++;
      logger.warn(`⚠️ Chunked generation partial success for ${video.videoId}. Missing: ${incompleteMaterialsList.join(', ')}`);
    }

  } catch (error) {
    // Check if it's a permanent error
    if (error instanceof Error) {
      const errorName = error.constructor.name;
      if (['LLMAuthenticationError', 'LLMPermissionError', 'LLMContentFilteredError'].includes(errorName)) {
        // Permanent error - mark as failed
        await Video.findByIdAndUpdate(video._id, {
          processingStatus: 'failed',
          errorType: errorName.replace('Error', '').toUpperCase(),
          errorMessage: error.message,
        });
        summary.permanentFailures++;
        logger.error(`❌ Chunked generation permanently failed for ${video.videoId}`);
        return;
      }
    }

    // Transient error - re-throw to be caught by outer handler
    logger.warn(`⚠️ Chunked generation failed temporarily for ${video.videoId}`);
    throw error;
  }
}

/**
 * Process video with standard (non-chunked) retry
 */
async function processVideoStandard(video: any, summary: any) {
  // For now, just leave as completed_with_warning
  // The standard retry uses the same generation as initial processing
  // This would be handled by re-running the full pipeline
  logger.info(`ℹ️ Video ${video.videoId} has transient error ${video.errorType}, will retry in next cron run`);
  summary.stillPending++;
}

/**
 * Helper: Save generated materials to database
 */
async function saveVideoMaterials(video: any, materials: any) {
  const userId = video.userId;
  const videoId = video.videoId;

  // Save flashcards
  if (materials.flashcards && materials.flashcards.length > 0) {
    await Flashcard.deleteMany({ userId, videoId }); // Clear old ones
    await Flashcard.insertMany(
      materials.flashcards.map((fc: any) => ({
        userId,
        videoId,
        question: fc.question,
        answer: fc.answer,
        difficulty: fc.difficulty,
        generationType: 'ai',
      }))
    );
    logger.info(`💾 Saved ${materials.flashcards.length} flashcards`);
  }

  // Save quizzes
  if (materials.quizzes && materials.quizzes.length > 0) {
    await Quiz.deleteMany({ userId, videoId }); // Clear old ones
    await Quiz.insertMany(
      materials.quizzes.map((quiz: any) => ({
        userId,
        videoId,
        questionText: quiz.questionText,
        options: quiz.options,
        correctAnswerIndex: quiz.correctAnswerIndex,
        explanation: quiz.explanation,
        difficulty: 'medium',
        generationType: 'ai',
      }))
    );
    logger.info(`💾 Saved ${materials.quizzes.length} quizzes`);
  }

  // Save mind map
  if (materials.mindMap && materials.mindMap.nodes && materials.mindMap.nodes.length > 0) {
    await MindMap.findOneAndUpdate(
      { userId, videoId },
      {
        userId,
        videoId,
        nodes: materials.mindMap.nodes,
        edges: materials.mindMap.edges,
        metadata: {
          generatedBy: 'ai',
          generatedAt: new Date(),
        },
      },
      { upsert: true, new: true }
    );
    logger.info(`💾 Saved mind map with ${materials.mindMap.nodes.length} nodes`);
  }

  // Save learning materials (chapters, prerequisites, real-world problems)
  if (materials.chapters || materials.prerequisites || materials.realWorldProblems) {
    await LearningMaterial.findOneAndUpdate(
      { userId, videoId },
      {
        userId,
        videoId,
        chapters: materials.chapters || [],
        prerequisites: materials.prerequisites || [],
        realWorldProblems: materials.realWorldProblems || [],
        videoSummary: materials.videoSummary || '',
        metadata: {
          generatedBy: GEMINI_MODEL_NAME,
          generatedAt: new Date(),
        },
      },
      { upsert: true, new: true }
    );
    logger.info(`💾 Saved learning materials`);
  }
}
