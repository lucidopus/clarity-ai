import { task, logger } from "@trigger.dev/sdk/v3";
import mongoose from 'mongoose';
import {
  processVideoChunked,
  processVideoStandard,
  isTokenLimitError,
  isPermanentError,
} from '../lib/video-retry-processing';

/**
 * Process a single failed video
 * This task is triggered by the retry-failed-videos coordinator task
 * Free tier optimized: Runs with concurrency limit of 3
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

      // CATEGORY 3: Permanent failures - mark as 'failed'
      if (isPermanentError(errorType)) {
        const Video = mongoose.model('Video');
        await Video.findByIdAndUpdate(video._id, {
          processingStatus: 'failed',
        });
        logger.info(`❌ Marked video ${video.videoId} as failed (${errorType})`);
        return {
          success: false,
          videoId: video.videoId,
          status: 'permanent_failure',
          errorType,
        };
      }

      // CATEGORY 2: Token limit errors - use chunked generation
      if (isTokenLimitError(errorType)) {
        const result = await processVideoChunked(video);
        logger.info(`✅ Chunked processing result for ${video.videoId}:`, result);
        return {
          ...result,
          status: 'chunked_processing',
          errorType,
        };
      }

      // CATEGORY 1: Transient errors & Validation Override - standard retry
      // VALIDATION_OVERRIDE: User requested generation for non-educational content. 
      // We use standard generation (full transcript) as it's not a token limit issue.
      const result = await processVideoStandard(video);
      logger.info(`🔄 Standard retry result for ${video.videoId}:`, result);
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
