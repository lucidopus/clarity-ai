"use client";

import { useEffect, useMemo, useState } from "react";
import AgentPlan, { AgentPlanStatus, AgentPlanTask } from "@/components/ui/agent-plan";

export type SourceType =
  | "youtube"
  | "document"
  | "audio"
  | "media"
  | "text"
  | "live_lecture"
  | "multi";

interface GenerationProgressProps {
  /** Backend-reported processing status; drives the final transition. */
  processingStatus: "pending" | "processing" | "completed" | "failed" | null;
  /** Source type to tune the extraction step label. */
  sourceType?: SourceType;
  /** Optional: milliseconds the current process has been running (for SSR/test). */
  elapsedMs?: number;
}

// Stage schedule expressed in seconds of elapsed time. Honest estimates based on
// the typical pipeline duration (~60s). The last stage stays "running" until the
// backend confirms completion.
const STAGE_SCHEDULE = {
  extractStart: 0,
  extractDone: 12,
  validateDone: 18,
  materialsStart: 18,
  flashcardsDone: 30,
  quizzesDone: 38,
  timestampsDone: 44,
  prereqsDone: 50,
  challengesDone: 56,
  mindmapDone: 62,
  materialsDone: 64,
  finalizeStart: 64,
} as const;

function extractionLabel(source?: SourceType): {
  title: string;
  description: string;
} {
  switch (source) {
    case "document":
      return {
        title: "Reading your document",
        description: "Parsing pages and stripping boilerplate.",
      };
    case "audio":
    case "media":
      return {
        title: "Transcribing audio",
        description: "Turning speech into text with ElevenLabs.",
      };
    case "text":
      return {
        title: "Ingesting your notes",
        description: "Normalising text for the model.",
      };
    case "live_lecture":
      return {
        title: "Preparing lecture transcript",
        description: "Combining live capture segments.",
      };
    case "multi":
      return {
        title: "Collecting all sources",
        description: "Merging your documents, notes and video into one context.",
      };
    case "youtube":
    default:
      return {
        title: "Extracting transcript",
        description: "Pulling captions straight from YouTube.",
      };
  }
}

export default function GenerationProgress({
  processingStatus,
  sourceType = "youtube",
  elapsedMs: elapsedMsProp,
}: GenerationProgressProps) {
  const [elapsed, setElapsed] = useState(elapsedMsProp ?? 0);

  // Local ticking clock. Only runs while actually processing.
  useEffect(() => {
    if (elapsedMsProp !== undefined) {
      setElapsed(elapsedMsProp);
      return;
    }
    if (processingStatus !== "processing" && processingStatus !== "pending") {
      return;
    }
    const start = Date.now() - elapsed;
    const interval = setInterval(() => {
      setElapsed(Date.now() - start);
    }, 500);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [processingStatus, elapsedMsProp]);

  const tasks: AgentPlanTask[] = useMemo(() => {
    const s = elapsed / 1000;
    const isFailed = processingStatus === "failed";
    const isDone = processingStatus === "completed";

    const step = (
      start: number,
      end: number,
    ): AgentPlanStatus => {
      if (isDone) return "completed";
      if (isFailed && s >= start && s < end) return "failed";
      if (s < start) return "pending";
      if (s < end) return "in-progress";
      return "completed";
    };

    // The final "finalize" step stays in-progress until the backend confirms done.
    const finalizeStatus: AgentPlanStatus = isDone
      ? "completed"
      : isFailed
        ? "failed"
        : s < STAGE_SCHEDULE.finalizeStart
          ? "pending"
          : "in-progress";

    // Materials task: overall status derived from subtasks. While subtasks run,
    // the parent shows in-progress; when all done, completed.
    const materialsStatus: AgentPlanStatus = isDone
      ? "completed"
      : isFailed && s >= STAGE_SCHEDULE.materialsStart && s < STAGE_SCHEDULE.materialsDone
        ? "failed"
        : s < STAGE_SCHEDULE.materialsStart
          ? "pending"
          : s < STAGE_SCHEDULE.materialsDone
            ? "in-progress"
            : "completed";

    const extract = extractionLabel(sourceType);

    return [
      {
        id: "extract",
        title: extract.title,
        description: extract.description,
        status: step(STAGE_SCHEDULE.extractStart, STAGE_SCHEDULE.extractDone),
      },
      {
        id: "validate",
        title: "Checking it's educational material",
        description: "Quick sanity pass so we only build study tools from real content.",
        status: step(STAGE_SCHEDULE.extractDone, STAGE_SCHEDULE.validateDone),
      },
      {
        id: "materials",
        title: "Generating your learning materials",
        description: "One structured LLM call produces every study tool in parallel.",
        status: materialsStatus,
        subtasks: [
          {
            id: "flashcards",
            title: "Writing flashcards",
            description: "Active-recall cards with difficulty tiers.",
            status: step(
              STAGE_SCHEDULE.materialsStart,
              STAGE_SCHEDULE.flashcardsDone,
            ),
          },
          {
            id: "quizzes",
            title: "Drafting quiz questions",
            description: "Multiple-choice with plausible distractors and explanations.",
            status: step(
              STAGE_SCHEDULE.flashcardsDone,
              STAGE_SCHEDULE.quizzesDone,
            ),
          },
          {
            id: "timestamps",
            title: "Mapping chapter timestamps",
            description: "Key moments so you can jump back to anything.",
            status: step(
              STAGE_SCHEDULE.quizzesDone,
              STAGE_SCHEDULE.timestampsDone,
            ),
          },
          {
            id: "prereqs",
            title: "Identifying prerequisites",
            description: "Background topics worth brushing up on first.",
            status: step(
              STAGE_SCHEDULE.timestampsDone,
              STAGE_SCHEDULE.prereqsDone,
            ),
          },
          {
            id: "challenges",
            title: "Building real-world challenges",
            description: "Scenario-based problems to stress-test understanding.",
            status: step(
              STAGE_SCHEDULE.prereqsDone,
              STAGE_SCHEDULE.challengesDone,
            ),
          },
          {
            id: "mindmap",
            title: "Drawing the mind map",
            description: "Concept graph connecting every idea.",
            status: step(
              STAGE_SCHEDULE.challengesDone,
              STAGE_SCHEDULE.mindmapDone,
            ),
          },
        ],
      },
      {
        id: "finalize",
        title: "Saving everything to your library",
        description: "Persisting materials and logging activity.",
        status: finalizeStatus,
      },
    ];
  }, [elapsed, processingStatus, sourceType]);

  return <AgentPlan tasks={tasks} defaultExpandedTaskIds={["materials"]} />;
}
