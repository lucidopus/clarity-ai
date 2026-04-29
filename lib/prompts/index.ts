/**
 * Prompts barrel — single import surface for callers.
 *
 * The `lib/prompts.ts` monolith is being split into per-artifact files in
 * this folder. During the transition, callers import from `@/lib/prompts`
 * (folder, resolves to this index) and we re-export both the new and
 * legacy symbols so call sites don't need to change.
 *
 * When all call sites have switched to the per-artifact builders, the
 * legacy `_legacy.ts` re-exports below can be removed.
 */

// New per-artifact builders.
export { buildFlashcardsPrompt } from './flashcards';
export { buildQuizzesPrompt } from './quizzes';
export { buildMindMapPrompt } from './mindmap';
export { buildPrerequisitesPrompt } from './prerequisites';
export { buildCaseStudyPrompt } from './case-study';
export { buildSummaryPrompt, type DensityHint } from './summary';
export { buildMetadataPrompt } from './metadata';
export { buildContentValidatorPrompt } from './content-validator';
export {
  buildFlashcardsCriticPrompt,
  buildFlashcardsRegenerationAddendum,
  FlashcardsCritiqueSchema,
  type FlashcardsCritique,
  type FlashcardForCritic,
} from './flashcards-critic';

// Clara (chatbot) prompts.
export { buildClaraSystemPrompt, type ClaraPromptContext } from './clara';
export { LIVE_LECTURE_QA_PROMPT, EXPLAIN_LAST_2_MIN_PROMPT } from './clara-live';

// Shared utilities (re-exported so callers don't need to know the folder layout).
export { SOURCE_FIDELITY_PREAMBLE } from './shared/source-fidelity';
export {
  buildLearnerContextSection,
  type LearnerContext,
  type ArtifactKind,
} from './shared/learner-context';

// Legacy monolith exports (kept until call sites switch to per-artifact builders).
// Note: legacy `LearnerContext` is intentionally not re-exported here — the
// shared one above is the canonical type going forward; the legacy file
// keeps its own local copy for its internal helpers.
export {
  buildLearningMaterialsPrompt,
  LEARNING_MATERIALS_PROMPT,
  CHATBOT_SYSTEM_PROMPT,
  AI_GUIDE_SYSTEM_PROMPT,
  CONTENT_VALIDATION_PROMPT,
} from './_legacy';
