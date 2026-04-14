"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import AgentPlan, { AgentPlanStatus, AgentPlanTask } from "@/components/ui/agent-plan";
import { ShiningText } from "@/components/ui/shining-text";

export type SourceType =
  | "youtube"
  | "document"
  | "audio"
  | "media"
  | "text"
  | "live_lecture"
  | "multi";

interface GenerationProgressProps {
  /** Backend-reported processing status; drives final completed/failed state. */
  processingStatus: "pending" | "processing" | "completed" | "failed" | null;
  /** Source type used to tailor the extraction label. */
  sourceType?: SourceType;
}

// Stage timings in milliseconds — chosen to roughly track typical pipeline
// durations. The last stage is intentionally generic and sticks until the
// backend reports completion, absorbing any remaining wall-clock time.
const STAGE_TIMINGS_MS = [8000, 5000, 32000] as const;

const GENERATING_PHRASES = [
  "Finding the key ideas…",
  "Spotting the aha moments…",
  "Deciding what's worth remembering…",
  "Mapping how these ideas connect…",
  "Picking what to quiz you on…",
  "Reading between the lines…",
  "Drawing the big picture…",
  "Double-checking its own work…",
  "Thinking harder than you'd expect…",
  "Making sure this actually sticks…",
  "Polishing the rough edges…",
  "Weighing every concept…",
];
const ROTATION_MS = 3500;

function extractionLabel(source?: SourceType): string {
  switch (source) {
    case "document":
      return "Reading every page of your document";
    case "audio":
    case "media":
      return "Transcribing every word you recorded";
    case "text":
      return "Taking in your notes";
    case "live_lecture":
      return "Piecing together your lecture";
    case "multi":
      return "Gathering everything you uploaded";
    case "youtube":
    default:
      return "Pulling the transcript straight from YouTube";
  }
}

export default function GenerationProgress({
  processingStatus,
  sourceType,
}: GenerationProgressProps) {
  const [stageIndex, setStageIndex] = useState(0);
  const [phraseIndex, setPhraseIndex] = useState(() =>
    Math.floor(Math.random() * GENERATING_PHRASES.length),
  );

  const isDone = processingStatus === "completed";
  const isFailed = processingStatus === "failed";

  // Advance through the first 3 stages on a timer; the 4th is sticky until
  // the backend flips processingStatus to completed/failed and this component
  // unmounts.
  useEffect(() => {
    if (isDone || isFailed) return;
    if (stageIndex >= STAGE_TIMINGS_MS.length) return;

    const timeout = setTimeout(() => {
      setStageIndex((i) => i + 1);
    }, STAGE_TIMINGS_MS[stageIndex]);

    return () => clearTimeout(timeout);
  }, [stageIndex, isDone, isFailed]);

  // Rotate the shimmer phrase while on the "crafting" stage.
  useEffect(() => {
    if (stageIndex !== 2 || isDone || isFailed) return;
    const id = setInterval(() => {
      setPhraseIndex((i) => (i + 1) % GENERATING_PHRASES.length);
    }, ROTATION_MS);
    return () => clearInterval(id);
  }, [stageIndex, isDone, isFailed]);

  const activeIndex = isDone ? 4 : stageIndex;

  const tasks: AgentPlanTask[] = useMemo(() => {
    const stageStatus = (index: number): AgentPlanStatus => {
      if (isDone) return "completed";
      if (isFailed && index === activeIndex) return "failed";
      if (index < activeIndex) return "completed";
      if (index === activeIndex) return "in-progress";
      return "pending";
    };

    return [
      {
        id: "extract",
        title: extractionLabel(sourceType),
        status: stageStatus(0),
      },
      {
        id: "learner_context",
        title: "Teaching the AI a bit about you",
        status: stageStatus(1),
      },
      {
        id: "generating",
        title: "Crafting your study materials",
        status: stageStatus(2),
      },
      {
        id: "finishing",
        title: "Adding the finishing touches",
        status: stageStatus(3),
      },
    ];
  }, [activeIndex, sourceType, isDone, isFailed]);

  return (
    <div className="space-y-3">
      <AgentPlan tasks={tasks} />
      {stageIndex === 2 && !isDone && !isFailed && (
        <div className="px-5 pt-1" aria-live="polite">
          <AnimatePresence mode="wait">
            <motion.div
              key={phraseIndex}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.25 }}
            >
              <ShiningText text={GENERATING_PHRASES[phraseIndex]} />
            </motion.div>
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
