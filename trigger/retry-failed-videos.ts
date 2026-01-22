import { schedules, logger } from "@trigger.dev/sdk/v3";
import mongoose from "mongoose";
import Video from "../lib/models/Video";
import { processSingleVideoTask } from "./process-single-video";

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
 * Scheduled Task: Retry Failed Videos
 * Schedule to be configured on Trigger.dev dashboard (recommended: every 6 hours)
 */
export const retryFailedVideos = schedules.task({
  id: "retry-failed-videos",
  // cron: "0 */6 * * *", // Set this on Trigger.dev dashboard instead
  maxDuration: 600, // 10 minutes

  run: async (_payload) => {
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
      // Note: validation_rejected videos are excluded - they need user action first
      const videos = await Video.find({
        processingStatus: 'completed_with_warning'
      });

      summary.videosFound = videos.length;
      logger.info(`📊 Found ${videos.length} videos to retry`);

      if (videos.length === 0) {
        logger.info("✅ No videos to retry");
        return summary;
      }

      // First, handle permanent failures sequentially (quick DB updates)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const videosToRetry: any[] = [];
      
      for (const video of videos) {
        const errorType = video.errorType || 'UNKNOWN';
        summary.breakdown.byErrorType[errorType] =
          (summary.breakdown.byErrorType[errorType] || 0) + 1;

        // CATEGORY 3: Permanent failures - mark as 'failed' immediately
        if (isPermanentError(errorType)) {
          await Video.findByIdAndUpdate(video._id, {
            processingStatus: 'failed',
          });
          summary.permanentFailures++;
          logger.info(`❌ Marked video ${video.videoId} as failed (${errorType})`);
        } else {
          // Add to batch for parallel processing
          videosToRetry.push(video);
        }
      }

      logger.info(`🚀 Batch processing ${videosToRetry.length} videos in parallel (concurrency: 3)`);

      // Process videos in parallel using batchTriggerAndWait
      if (videosToRetry.length > 0) {
        const batchPayloads = videosToRetry.map(video => ({
          payload: { video }
        }));

        try {
          const results = await processSingleVideoTask.batchTriggerAndWait(batchPayloads);
          
          // Aggregate results
          for (const result of results.runs) {
            if (result.ok) {
              const output = result.output;
              
              if (output.success) {
                summary.successfulRetries++;
                if (output.status === 'chunked_processing') {
                  summary.breakdown.chunkedGeneration++;
                } else {
                  summary.breakdown.standardRetry++;
                }
                logger.info(`✅ Successfully processed ${output.videoId} (${output.status})`);
              } else {
                summary.stillPending++;
                if ('incompleteMaterials' in output && output.incompleteMaterials) {
                  logger.warn(`⚠️ Partially completed ${output.videoId}. Incomplete: ${output.incompleteMaterials.join(', ')}`);
                } else {
                  logger.warn(`⚠️ Video ${output.videoId} still pending (${output.status})`);
                }
              }
            } else {
              summary.stillPending++;
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const errorMsg = (result.error as any)?.message || 'Unknown error';
              summary.errors.push(`${result.id}: ${errorMsg}`);
              logger.error(`⚠️ Task failed for video:`, result.error as Record<string, unknown>);
            }
          }
        } catch (batchError) {
          logger.error("💥 Batch processing error:", batchError as Record<string, unknown>);
          summary.errors.push(`BATCH_ERROR: ${batchError instanceof Error ? batchError.message : 'Unknown'}`);
          summary.stillPending += videosToRetry.length;
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
