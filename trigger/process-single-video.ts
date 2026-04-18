import { task, logger } from "@trigger.dev/sdk/v3";
import mongoose from 'mongoose';
import Source from '../lib/models/Source';
import {
  processVideoChunked,
  processVideoStandard,
  isTokenLimitError,
  isPermanentError,
} from '../lib/video-retry-processing';
import { generateUserRecommendations } from './recommendations';

/**
 * Process a single failed video
 * This task is triggered by the retry-failed-videos coordinator task
 * Free tier optimized: Runs with concurrency limit of 3
 *
 * Updated to support dual-write architecture (Video + Source collections).
 */
export const processSingleVideoTask = task({
  id: "process-single-video",
  queue: {
    name: "video-retry-queue",
    concurrencyLimit: 3, // Free tier: process 3 videos at a time
  },
  maxDuration: 600, // 10 minutes per video
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  run: async (payload: { video: any }) => {
    const { video } = payload;

    logger.info(`🎬 Processing video: ${video.videoId}`);
    logger.info(`   Error type: ${video.errorType || 'UNKNOWN'}`);
    logger.info(`   Incomplete materials: ${video.incompleteMaterials?.join(', ') || 'none'}`);

    try {
      // Connect to MongoDB if not already connected
      if (mongoose.connection.readyState === 0) {
        if (!process.env.MONGODB_URI) {
          throw new Error("MONGODB_URI is not set");
        }
        await mongoose.connect(process.env.MONGODB_URI);
        logger.info("📊 Connected to MongoDB");
      }

      const errorType = video.errorType || 'UNKNOWN';

      // CATEGORY 3: Permanent failures - mark as 'failed' on both Video + Source
      if (isPermanentError(errorType)) {
        const Video = mongoose.model('Video');
        const failedPayload = { processingStatus: 'failed' };
        await Video.findByIdAndUpdate(video._id, failedPayload);
        await Source.findOneAndUpdate(
          { userId: video.userId, sourceId: video.videoId },
          failedPayload
        );
        logger.info(`❌ Marked video ${video.videoId} as failed (${errorType}) [Video + Source]`);
        return {
          success: false,
          videoId: video.videoId,
          status: 'permanent_failure',
          errorType,
        };
      }

      // CATEGORY 2: Token limit errors OR partial-artifact failures from the
      // main pipeline → use chunked/selective generation so we only regenerate
      // what's actually missing. PARTIAL_ARTIFACT_FAILURE comes from V2 when
      // one or more per-artifact calls fail/timeout (e.g. the quiz call
      // exceeds its window) — routing it to chunked preserves the artifacts
      // that already succeeded along with their downstream state (FSRS on
      // flashcards, MindMap nodes, etc).
      const hasIncompleteList = Array.isArray(video.incompleteMaterials) && video.incompleteMaterials.length > 0;
      if (isTokenLimitError(errorType) || errorType === 'PARTIAL_ARTIFACT_FAILURE' || hasIncompleteList) {
        const result = await processVideoChunked(video);
        logger.info(`✅ Chunked processing result for ${video.videoId}:`, result);
        // Refresh discover recommendations so new content appears immediately
        if (result.success) {
          await generateUserRecommendations.trigger({
            userId: video.userId.toString(),
            username: 'User',
          }).catch((err: unknown) => logger.warn('Failed to trigger recommendation refresh', { err }));
        }
        return {
          ...result,
          status: 'chunked_processing',
          errorType,
        };
      }

      // CATEGORY 1: Transient errors & Validation Override - standard retry
      const result = await processVideoStandard(video);
      logger.info(`🔄 Standard retry result for ${video.videoId}:`, result);
      // Refresh discover recommendations so new content appears immediately
      if (result.success) {
        await generateUserRecommendations.trigger({
          userId: video.userId.toString(),
          username: 'User',
        }).catch((err: unknown) => logger.warn('Failed to trigger recommendation refresh', { err }));
      }
      return {
        ...result,
        status: 'standard_retry',
        errorType,
      };

    } catch (error) {
      // If processing fails, log error but don't mark as failed
      // Let the video stay as 'completed_with_warning' for next cron run
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      logger.error(`⚠️ Error processing video ${video.videoId}: ${errorMsg}`, error as Record<string, unknown>);

      return {
        success: false,
        videoId: video.videoId,
        status: 'processing_error',
        error: errorMsg,
      };
    }
  },
});
