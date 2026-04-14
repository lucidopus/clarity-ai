import { task, logger, auth } from "@trigger.dev/sdk";
import mongoose from "mongoose";
import Video from "../lib/models/Video";
import Source from "../lib/models/Source";
import User from "../lib/models/User";
import LiveSession from "../lib/models/LiveSession";
import type { SourceType } from "../lib/models/Source";
import type { IServiceUsage } from "../lib/models/Cost";
import type { ExtractorInput } from "../lib/extractors/types";
import type { LearnerContext } from "../lib/prompts";
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
import { recordStudyActivity } from "../lib/services/streaks";

// Configure auth for triggering from API routes
auth.configure({
  secretKey: process.env.TRIGGER_SECRET_KEY,
});

/** Source type descriptions for the LLM prompt */
const SOURCE_DESCRIPTIONS: Record<SourceType, string> = {
  youtube: "a video transcript",
  text: "educational notes and text content",
  audio: "an audio recording transcript",
  document: "a document",
  media: "media content",
  live_lecture: "a live lecture transcript captured in real-time",
};

/** Labels used when concatenating multiple sources for the LLM */
const SOURCE_LABELS: Record<SourceType, string> = {
  youtube: "Video Transcript",
  text: "Study Notes",
  audio: "Audio Transcript",
  document: "Document Content",
  media: "Media Content",
  live_lecture: "Live Lecture Transcript",
};

interface SourceItemPayload {
  sourceType: SourceType;
  sourceId: string;
  sourceUrl?: string;
  rawText?: string;
  title?: string;
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  mimeType?: string;
}

interface ProcessPipelinePayload {
  userId: string;
  username: string;
  videoDocId: string;
  sourceId: string;
  sourceType: SourceType;
  // Source-specific (legacy / primary)
  sourceUrl?: string;
  rawText?: string;
  fileUrl?: string;
  fileName?: string;
  mimeType?: string;
  fileSize?: number;
  // Multi-source
  allSources?: SourceItemPayload[];
  // Client context
  clientTimestamp?: string;
  timezoneOffsetMinutes?: number;
  timeZone?: string;
}

/**
 * Builds a combined content string from multiple extracted sources
 * with contextual labels so the LLM understands what each section is.
 */
function buildCombinedContent(
  extractedSources: Array<{ sourceType: SourceType; text: string; title?: string }>
): string {
  // Single source — no labels needed
  if (extractedSources.length === 1) {
    return extractedSources[0].text;
  }

  // Multiple sources — label each clearly
  const parts = extractedSources.map((source, i) => {
    const label = SOURCE_LABELS[source.sourceType] || "Content";
    const titleSuffix = source.title ? ` — ${source.title}` : "";
    const header = `═══ Source ${i + 1}: ${label}${titleSuffix} ═══`;
    return `${header}\n\n${source.text}`;
  });

  const intro = `This content is compiled from ${extractedSources.length} sources. Consider all sources together when generating study materials.\n\n`;
  return intro + parts.join("\n\n");
}

/**
 * Main content processing pipeline task.
 *
 * Runs the full extraction → validation → LLM generation → save flow
 * as a background Trigger.dev task, avoiding Vercel's 60s timeout.
 * Supports multiple source types and multi-source concatenation.
 */
export const processVideoPipelineTask = task({
  id: "process-video-pipeline",
  maxDuration: 900, // 15 minutes
  retry: {
    maxAttempts: 0,
  },
  queue: {
    name: "video-processing",
    concurrencyLimit: 3,
  },
  onFailure: async ({ payload, error }) => {
    logger.error("Pipeline failed", { error, payload });
    try {
      if (mongoose.connection.readyState === 0) {
        if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI is not set");
        await mongoose.connect(process.env.MONGODB_URI);
      }

      const { userId, videoDocId, sourceId } = payload as ProcessPipelinePayload;
      const failPayload = {
        processingStatus: "failed",
        errorType: "PIPELINE_FAILURE",
        errorMessage: error instanceof Error ? error.message : "Pipeline task failed unexpectedly",
      };
      await Video.findByIdAndUpdate(videoDocId, failPayload);
      await Source.findOneAndUpdate({ userId, sourceId }, failPayload);
      logger.info("Updated status to failed", { sourceId });
    } catch (dbError) {
      logger.error("Failed to update status on failure", { dbError });
    }
  },
  run: async (payload: ProcessPipelinePayload) => {
    const {
      userId,
      username,
      videoDocId,
      sourceId,
      sourceType,
      sourceUrl,
      rawText,
      allSources,
      clientTimestamp,
      timezoneOffsetMinutes,
      timeZone,
    } = payload;

    logger.info("Starting processing pipeline", { sourceId, sourceType, userId, username, sourceCount: allSources?.length || 1 });

    // 1. Connect to MongoDB
    if (mongoose.connection.readyState === 0) {
      if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI is not set");
      await mongoose.connect(process.env.MONGODB_URI);
      logger.info("Connected to MongoDB");
    }

    const services: IServiceUsage[] = [];

    // 2. Determine sources to process
    const sourcesToProcess: SourceItemPayload[] = allSources && allSources.length > 0
      ? allSources
      : [{ sourceType, sourceId, sourceUrl, rawText }];

    // 3. Extract and save each source independently
    const extractedTexts: Array<{ sourceType: SourceType; text: string; title?: string }> = [];
    let primaryExtraction: { text: string; metadata: { wordCount?: number } } | null = null;
    let hasYouTube = false;

    for (const src of sourcesToProcess) {
      logger.info(`Processing source: ${src.sourceType}`, { sourceId: src.sourceId });

      const extractorInput: ExtractorInput = {
        sourceType: src.sourceType,
        sourceUrl: src.sourceUrl,
        rawText: src.rawText,
        fileUrl: src.fileUrl,
        fileName: src.fileName,
        mimeType: src.mimeType,
      };

      const extractResult = await extractContent(extractorInput, services);

      if (!extractResult.success) {
        // If the primary source fails, fail the whole pipeline
        if (src.sourceId === sourceId) {
          const failPayload = {
            processingStatus: "failed",
            errorType: extractResult.error.code,
            errorMessage: `Extraction failed: ${extractResult.error.message}`,
          };
          await Video.findByIdAndUpdate(videoDocId, failPayload);
          await Source.findOneAndUpdate({ userId, sourceId }, failPayload);
          logger.error("Primary source extraction failed", { error: extractResult.error });
          return { success: false, sourceId, error: extractResult.error.code };
        }
        // Non-primary source failure — log warning but continue
        logger.warn(`Non-primary source extraction failed, skipping`, {
          sourceId: src.sourceId,
          sourceType: src.sourceType,
          errorCode: extractResult.error.code,
          errorMessage: extractResult.error.message,
          recoverable: extractResult.error.recoverable,
        });
        continue;
      }

      const { extraction } = extractResult;
      logger.info("Content extracted", { sourceId: src.sourceId, wordCount: extraction.metadata.wordCount, sourceType: src.sourceType });

      // Save each source to DB independently
      await saveExtraction(userId, videoDocId, src.sourceId, src.sourceType, extraction, { sourceUrl: src.sourceUrl, fileUrl: src.fileUrl });

      extractedTexts.push({
        sourceType: src.sourceType,
        text: extraction.text,
        title: src.title,
      });

      if (src.sourceType === "youtube") hasYouTube = true;
      if (src.sourceId === sourceId) primaryExtraction = extraction;
    }

    if (extractedTexts.length === 0 || !primaryExtraction) {
      const failPayload = { processingStatus: "failed", errorType: "NO_CONTENT", errorMessage: "No content could be extracted from any source" };
      await Video.findByIdAndUpdate(videoDocId, failPayload);
      return { success: false, sourceId, error: "NO_CONTENT" };
    }

    // 4. Validate educational content (only for YouTube/audio — skip for user-provided text)
    if (hasYouTube || sourcesToProcess.some(s => s.sourceType === "audio")) {
      const textToValidate = extractedTexts.find(t => t.sourceType === "youtube" || t.sourceType === "audio")?.text || primaryExtraction.text;
      const validation = await validateContent(textToValidate, userId, sourceId, videoDocId, services);
      if (validation.rejected) {
        logger.warn("Content rejected by validation", { reason: validation.reason });
        return { success: false, sourceId, error: "VALIDATION_REJECTED", reason: validation.reason };
      }
    }

    // 5. Build combined content for LLM
    let combinedContent = buildCombinedContent(extractedTexts);
    const hasTimestamps = hasYouTube || sourcesToProcess.some(s => s.sourceType === "audio");

    // For live lectures: append student focus notes & importance markers as extra context
    if (sourceType === "live_lecture") {
      try {
        const liveSession = await LiveSession.findOne({ sourceId });
        if (liveSession) {
          const extras: string[] = [];
          if (liveSession.focusNotes?.trim()) {
            extras.push(`\n\n═══ Student's Focus Notes (taken during lecture) ═══\n\n${liveSession.focusNotes}`);
          }
          if (liveSession.importanceMarkers?.length > 0) {
            const markerTimes = liveSession.importanceMarkers
              .map((m: { offsetSeconds: number }) => {
                const mins = Math.floor(m.offsetSeconds / 60);
                const secs = Math.floor(m.offsetSeconds % 60);
                return `${mins}:${secs.toString().padStart(2, '0')}`;
              })
              .join(', ');
            extras.push(`\n\n═══ Moments Marked as Important by Student ═══\n\nThe student highlighted these timestamps as particularly important: ${markerTimes}. Pay extra attention to content around these moments when generating study materials.`);
          }
          if (extras.length > 0) {
            combinedContent += extras.join('');
            logger.info("Appended live lecture context", { hasNotes: !!liveSession.focusNotes?.trim(), markerCount: liveSession.importanceMarkers?.length || 0 });
          }
        }
      } catch (e) {
        logger.warn("Failed to load live session context", { error: e });
      }
    }

    // Build a source description for the LLM prompt
    const sourceDescription = extractedTexts.length === 1
      ? SOURCE_DESCRIPTIONS[extractedTexts[0].sourceType] || "educational content"
      : `${extractedTexts.length} combined sources (${extractedTexts.map(t => SOURCE_LABELS[t.sourceType]).join(" + ")})`;

    logger.info("Combined content for LLM", {
      sourceCount: extractedTexts.length,
      combinedLength: combinedContent.length,
      hasTimestamps,
      sourceDescription,
    });

    // 6. Fetch learner context for personalized generation
    let learnerContext: LearnerContext | undefined;
    try {
      const user = await User.findById(userId).select('preferences.learning').lean();
      const learning = (user as Record<string, unknown>)?.preferences as Record<string, unknown> | undefined;
      const lp = learning?.learning as Record<string, unknown> | undefined;
      if (lp) {
        const pp = lp.personalityProfile as Record<string, number> | undefined;
        learnerContext = {
          role: lp.role as string | undefined,
          learningGoals: lp.learningGoals as string[] | undefined,
          learningChallenges: lp.learningChallenges as string[] | undefined,
          selfEfficacy: pp?.selfEfficacy,
          masteryOrientation: pp?.masteryOrientation,
          performanceOrientation: pp?.performanceOrientation,
        };
        logger.info("Learner context loaded for personalized generation", { role: learnerContext.role, goals: learnerContext.learningGoals });
      }
    } catch (e) {
      logger.warn("Failed to load learner context, proceeding without personalization", { error: e });
    }

    // 7. Generate learning materials via LLM
    const llmResult = await generateMaterials(combinedContent, sourceId, services, {
      sourceType,
      hasTimestamps,
      sourceDescription,
      learnerContext,
    });

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

    // 8. Save learning materials (if LLM succeeded)
    if (materials) {
      await saveLearningMaterials(userId, sourceId, materials);
    }

    // 9. Update final status (Video + Source)
    await updateFinalStatus(userId, videoDocId, sourceId, primaryExtraction.text, materials, llmError, llmErrorCode);

    // 10. Log activity (if materials generated)
    if (materials) {
      await logActivity(userId, sourceId, materials, clientTimestamp, timezoneOffsetMinutes, timeZone);
      try {
        await recordStudyActivity(userId, 'source_processed');
      } catch (err) {
        logger.warn("Failed to record streak activity", { err: err instanceof Error ? err.message : String(err) });
      }
    }

    // 11. Log costs
    await logCosts(userId, videoDocId, services);

    if (llmError) {
      logger.warn("Pipeline completed with warning", { sourceId, errorCode: llmErrorCode });
      return { success: true, sourceId, warning: llmErrorCode };
    }

    logger.info("Pipeline completed successfully", { sourceId, sourceType, sourceCount: extractedTexts.length });
    return { success: true, sourceId };
  },
});
