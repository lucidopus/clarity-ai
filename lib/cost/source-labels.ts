/**
 * Shared display metadata for CostSource values.
 *
 * Every CostSource added to lib/models/Cost.ts MUST get an entry here so
 * admin dashboards (FeatureBreakdownChart, OperationLegend, etc.) render
 * meaningful labels instead of raw enum strings.
 */

import { CostSource } from '@/lib/cost/enums';

export interface CostSourceMeta {
  displayName: string;
  description: string;
  icon: string;
  exampleServices: string[];
}

export const COST_SOURCE_META: Record<CostSource, CostSourceMeta> = {
  [CostSource.LEARNING_MATERIAL_GENERATION]: {
    displayName: 'Learning Material Generation',
    description:
      'Full pipeline operation: extracts video transcript and generates comprehensive learning materials including flashcards, quizzes, timestamps, prerequisites, and mind maps in a single operation.',
    icon: '📚',
    exampleServices: ['Transcript Extraction', 'Content Validation', 'LLM Processing'],
  },
  [CostSource.LEARNING_CHATBOT]: {
    displayName: 'Learning Chatbot',
    description:
      'User query about video content. Processes questions about the material and provides intelligent answers based on the video transcript.',
    icon: '💬',
    exampleServices: ['LLM Processing', 'Animation Tool'],
  },
  [CostSource.CHALLENGE_CHATBOT]: {
    displayName: 'Challenge Chatbot',
    description:
      'User query for help with real-world coding problems. Provides hints, explanations, and guidance related to the challenge without giving away the solution.',
    icon: '🎯',
    exampleServices: ['LLM Processing'],
  },
  [CostSource.LIVE_LECTURE_TRANSCRIPTION]: {
    displayName: 'Live Lecture Transcription',
    description:
      'Realtime speech-to-text via ElevenLabs Scribe during live lectures. Billed per minute of audio captured.',
    icon: '🎙️',
    exampleServices: ['ElevenLabs Scribe'],
  },
  [CostSource.LIVE_LECTURE_QA]: {
    displayName: 'Live Lecture Q&A',
    description:
      'Clara answers questions asked during a live lecture using transcript + context docs as grounding.',
    icon: '❓',
    exampleServices: ['LLM Processing'],
  },
};

/**
 * Resolve a CostSource (or unknown string from legacy records) to a display label.
 */
export function getCostSourceDisplayName(source: string): string {
  const meta = COST_SOURCE_META[source as CostSource];
  return meta ? meta.displayName : source;
}

/**
 * Resolve a CostSource to full metadata. Falls back to a minimal definition for
 * unknown sources so UIs don't crash on legacy data.
 */
export function getCostSourceMeta(source: string): CostSourceMeta {
  return (
    COST_SOURCE_META[source as CostSource] ?? {
      displayName: source,
      description: 'No description available for this source.',
      icon: '•',
      exampleServices: [],
    }
  );
}
