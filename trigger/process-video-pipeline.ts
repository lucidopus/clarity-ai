import { task, logger, auth } from "@trigger.dev/sdk";
import mongoose from "mongoose";
import Video from "../lib/models/Video";
import Source from "../lib/models/Source";
import type { IServiceUsage } from "../lib/models/Cost";
import {
  extractContent,
  saveExtraction,
  validateContent,
  generateMaterials,
  saveLearningMaterials,
  updateFinalStatus,
  logActivity,
  logCosts,
} from "../lib/pipeline-helpers";

// Configure auth for triggering from API routes
auth.configure({
  secretKey: process.env.TRIGGER_SECRET_KEY,
});

interface ProcessVideoPipelinePayload {
  userId: string;
  username: string;
  videoDocId: string;
  videoId: string;
  youtubeUrl: string;
  clientTimestamp?: string;
  timezoneOffsetMinutes?: number;
  timeZone?: string;
}

/**
 * Main video processing pipeline task.
 *
 * Runs the full extraction → validation → LLM generation → save flow
 * as a background Trigger.dev task, avoiding Vercel's 60s timeout.
 */
export const processVideoPipelineTask = task({
  id: "process-video-pipeline",
  maxDuration: 900, // 15 minutes
  retry: {
    maxAttempts: 0, // No orchestrator-level retries
  },
  queue: {
    name: "video-processing",
    concurrencyLimit: 3,
  },
  onFailure: async ({ payload, error }) => {
    // Ensure failed runs always mark the video as failed
    logger.error("Pipeline failed", { error, payload });
    try {
      if (mongoose.connection.readyState === 0) {
        if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI is not set");
        await mongoose.connect(process.env.MONGODB_URI);
      }

      const { userId, videoDocId, videoId } = payload as ProcessVideoPipelinePayload;
      const failPayload = {
        processingStatus: "failed",
        errorType: "PIPELINE_FAILURE",
        errorMessage: error instanceof Error ? error.message : "Pipeline task failed unexpectedly",
      };
      await Video.findByIdAndUpdate(videoDocId, failPayload);
      await Source.findOneAndUpdate({ userId, sourceId: videoId }, failPayload);
      logger.info("Updated video status to failed", { videoId });
    } catch (dbError) {
      logger.error("Failed to update video status on failure", { dbError });
    }
  },
  run: async (payload: ProcessVideoPipelinePayload) => {
    const {
      userId,
      username,
      videoDocId,
      videoId,
      youtubeUrl,
      clientTimestamp,
      timezoneOffsetMinutes,
      timeZone,
    } = payload;

    logger.info("Starting video processing pipeline", { videoId, userId, username });

    // 1. Connect to MongoDB
    if (mongoose.connection.readyState === 0) {
      if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI is not set");
      await mongoose.connect(process.env.MONGODB_URI);
      logger.info("Connected to MongoDB");
    }

    // 2. Extract content
    const services: IServiceUsage[] = [];
    const extractResult = await extractContent(youtubeUrl, services);

    if (!extractResult.success) {
      const failPayload = {
        processingStatus: "failed",
        errorType: extractResult.error.code,
        errorMessage: `Extraction failed: ${extractResult.error.message}`,
      };
      await Video.findByIdAndUpdate(videoDocId, failPayload);
      await Source.findOneAndUpdate({ userId, sourceId: videoId }, failPayload);
      logger.error("Extraction failed", { error: extractResult.error });
      return { success: false, videoId, error: extractResult.error.code };
    }

    const { extraction } = extractResult;
    logger.info("Content extracted", { wordCount: extraction.metadata.wordCount });

    // 3. Save extraction to DB
    await saveExtraction(userId, videoDocId, videoId, youtubeUrl, extraction);

    // 4. Validate educational content
    const validation = await validateContent(extraction.text, userId, videoId, videoDocId, services);
    if (validation.rejected) {
      logger.warn("Content rejected by validation", { reason: validation.reason });
      return { success: false, videoId, error: "VALIDATION_REJECTED", reason: validation.reason };
    }

    // 5. Generate learning materials via LLM
    const llmResult = await generateMaterials(extraction.text, videoId, services);

    let materials = null;
    let llmError: unknown = null;
    let llmErrorCode: string | null = null;

    if ("error" in llmResult) {
      llmError = llmResult.error;
      llmErrorCode = llmResult.errorCode;
      logger.warn("LLM generation failed", { errorCode: llmErrorCode });
    } else {
      materials = llmResult.materials;
      logger.info("Materials generated successfully");
    }

    // 6. Save learning materials (if LLM succeeded)
    if (materials) {
      await saveLearningMaterials(userId, videoId, materials);
    }

    // 7. Update final status (Video + Source)
    await updateFinalStatus(userId, videoDocId, videoId, extraction.text, materials, llmError, llmErrorCode);

    // 8. Log activity (if materials generated)
    if (materials) {
      await logActivity(userId, videoId, materials, clientTimestamp, timezoneOffsetMinutes, timeZone);
    }

    // 9. Log costs
    await logCosts(userId, videoDocId, services);

    if (llmError) {
      logger.warn("Pipeline completed with warning", { videoId, errorCode: llmErrorCode });
      return { success: true, videoId, warning: llmErrorCode };
    }

    logger.info("Pipeline completed successfully", { videoId });
    return { success: true, videoId };
  },
});
