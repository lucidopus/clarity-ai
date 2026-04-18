import { SOURCE_FIDELITY_PREAMBLE } from './shared/source-fidelity';
import { buildLearnerContextSection, type LearnerContext } from './shared/learner-context';
import { QUIZ_EXAMPLE } from './shared/few-shot';

/**
 * Quiz generation prompt — built around a single observation: the value of an
 * MCQ comes from its **distractors**, not its question. A great quiz turns a
 * wrong answer into a teaching moment by trapping a *real misconception* the
 * learner would plausibly hold and then explaining why it's wrong.
 *
 * The schema requires `richOptions` (text + isCorrect + per-distractor
 * misconception). The prompt encodes the rules that make those distractors
 * actually pedagogical, plus standard MCQ anti-patterns to avoid.
 */

const STATIC_INSTRUCTIONS = `# Quiz Generation

You are creating multiple-choice questions a learner will use to test their understanding. The quality of an MCQ is determined by its **distractors**, not its stem. A good distractor is a misconception a thoughtful learner would actually hold; a bad distractor is something obviously wrong that the learner can rule out without thinking.

${SOURCE_FIDELITY_PREAMBLE}

## Distractor rules (the most important section)

1. **Every distractor must encode a real misconception.** Tag it explicitly in the \`misconception\` field — one sentence naming the false belief or reasoning error this option traps. Examples: "confuses correlation with causation", "applies the formula in the wrong unit system", "remembers the rule but inverts cause and effect."
2. **No throwaway distractors.** "All of the above" / "None of the above" are banned. So are distractors that are clearly the wrong category (e.g., a number when the answer is a name).
3. **No test-taking heuristics.** Distractors and the correct answer must be similar in length, register, and grammatical structure. Do not let "the longest answer is correct" be a winning strategy.
4. **No negative-phrasing tricks.** Avoid "Which of the following is NOT…" unless the source explicitly contrasts a list.
5. **Distractors must be plausible from the source.** If a distractor is a fact the learner could only know from outside the source, it isn't really testing source comprehension.

## Bloom's mix (deck-level constraint)

Across the full set of 10–15 questions, at least **30% must be \`apply\` or \`analyze\`** — not pure \`recall\`. A quiz that's all definition-recall is what a quizlet from 2010 looked like. Tag each item.

## Difficulty mix

Include some easy (warm-up / confidence-building), most medium, and a few hard. Order doesn't have to be strictly easy-to-hard, but a learner shouldn't hit four hard questions back to back.

## Explanation requirements

Each item's \`explanation\` field must contain TWO things:
1. **Why the correct answer is correct**, grounded in a specific claim from the source.
2. **For each distractor, why a learner might pick it AND why it's wrong.** This is the "ah-ha" moment — don't skip it. Keep the whole explanation tight; aim for 3–6 sentences total.

## Source attribution

For each question, include a \`sourceRef\` (\`startTime\` for video/audio in seconds, \`page\` for documents, or a verbatim \`quote\` ≤200 chars). This lets the learner jump back to where the question came from.

${QUIZ_EXAMPLE}

`;

export function buildQuizzesPrompt(options: {
  content: string;
  learnerContext?: LearnerContext;
  sourceDescription?: string;
}): string {
  const { content, learnerContext, sourceDescription } = options;
  const learner = buildLearnerContextSection(learnerContext, 'quizzes');
  const sourceLine = sourceDescription
    ? `The source is ${sourceDescription}.\n\n`
    : '';

  return `${STATIC_INSTRUCTIONS}
${learner}
${sourceLine}<source_content>
${content}
</source_content>

Return a JSON object matching the quizzes schema. Apply every rule above — especially the distractor rules.`;
}
