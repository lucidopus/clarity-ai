/**
 * Learner-context injection — applied to every artifact prompt so generation
 * is personalized, not just one-size-fits-all. Previously the case-study
 * prompt was the only artifact that received learner context.
 *
 * The injection is **artifact-aware**: a beginner needs more scaffolded
 * flashcards, a mastery-oriented learner needs harder discrimination cards,
 * a time-poor learner needs the highest-leverage items flagged. We pass the
 * artifact type so the helper returns guidance tailored to that artifact.
 */

export interface LearnerContext {
  role?: string;
  learningGoals?: string[];
  learningChallenges?: string[];
  /** 1–7 scale: how confident the learner feels about their ability to learn this material. Low = needs encouragement and scaffolding. */
  selfEfficacy?: number;
  /** 1–7 scale: how motivated by deep understanding (vs. just performance). High = wants depth. */
  masteryOrientation?: number;
  /** 1–7 scale: how motivated by demonstrating ability (vs. process). High = responds to challenge framing. */
  performanceOrientation?: number;
}

export type ArtifactKind =
  | 'flashcards'
  | 'quizzes'
  | 'mindmap'
  | 'prerequisites'
  | 'caseStudy'
  | 'summary'
  | 'metadata';

/**
 * Build a Learner Context section to inject into an artifact prompt.
 * Returns an empty string when there's no useful learner context to add —
 * callers can blindly concatenate.
 */
export function buildLearnerContextSection(
  ctx: LearnerContext | undefined,
  artifact: ArtifactKind,
): string {
  if (!ctx) return '';
  const hasAnything =
    ctx.role ||
    ctx.learningGoals?.length ||
    ctx.learningChallenges?.length ||
    ctx.selfEfficacy != null ||
    ctx.masteryOrientation != null ||
    ctx.performanceOrientation != null;
  if (!hasAnything) return '';

  const lines: string[] = [];

  // Identity line — same across artifacts.
  const role = ctx.role || 'Student';
  const goals = ctx.learningGoals?.join(', ') || '';
  lines.push(
    goals
      ? `The learner is a ${role} focused on: ${goals}.`
      : `The learner is a ${role}.`,
  );

  // Per-artifact tailoring.
  const lowSelfEfficacy = (ctx.selfEfficacy ?? 5) <= 3;
  const highMastery = (ctx.masteryOrientation ?? 4) >= 5;
  const highPerformance = (ctx.performanceOrientation ?? 4) >= 5;
  const challenges = ctx.learningChallenges || [];

  switch (artifact) {
    case 'flashcards':
      if (lowSelfEfficacy) {
        lines.push('Bias the deck toward easier card types (`definition`, `cloze`) before harder ones (`discrimination`, `application`). Phrase questions warmly. Avoid trick wording.');
      }
      if (highMastery) {
        lines.push('Include extra `discrimination` and `application` cards that force deeper engagement, even at the cost of fewer `definition` cards.');
      }
      if (challenges.includes('retention')) {
        lines.push('Favor `cloze` cards on the most central facts — they reinforce retrieval more than Q/A for memorization-heavy material.');
      }
      break;

    case 'quizzes':
      if (lowSelfEfficacy) {
        lines.push('Ensure at least one easy item appears early in the set (a confidence builder). Distractors should be clearly distinct so an honest learner can rule them out.');
      }
      if (highPerformance) {
        lines.push('Frame at least one item as a challenge ("Most learners get this wrong — see if you can spot the trap").');
      }
      if (highMastery) {
        lines.push('Tilt the Bloom mix toward `apply` and `analyze`. Recall items should be the minority.');
      }
      break;

    case 'mindmap':
      if (lowSelfEfficacy) {
        lines.push('Keep node labels short and concrete. Prefer fewer nodes that are well-explained over many nodes that overwhelm.');
      }
      if (highMastery) {
        lines.push('Include more cross-branch `causes` / `analogous-to` edges that reveal non-obvious structure.');
      }
      break;

    case 'prerequisites':
      if (challenges.includes('lack-of-structure')) {
        lines.push('Order the prerequisites as a numbered learning path, easiest first.');
      }
      if (challenges.includes('retention')) {
        lines.push('In `whyItMatters`, name the specific concept in this source the prerequisite unlocks — concrete connection helps recall.');
      }
      break;

    case 'caseStudy':
      lines.push(
        `Frame the scenario so the learner's role matches their background — if they are a Working Professional, cast them in a professional role; if a Student, use an academic or early-career framing. Keep the core problem and concepts identical regardless of framing.`,
      );
      break;

    case 'summary':
      if (highMastery) {
        lines.push('Lean longer and include nuance/caveats explicitly.');
      } else if (lowSelfEfficacy) {
        lines.push('Lean shorter and prioritize the 3–5 most important takeaways with plain-language framing.');
      }
      break;

    case 'metadata':
      // No meaningful per-learner tailoring for title/category/tags.
      break;
  }

  return `## Learner context\n\n${lines.join('\n')}\n`;
}
