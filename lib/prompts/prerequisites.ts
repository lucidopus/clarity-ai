import { SOURCE_FIDELITY_PREAMBLE } from './shared/source-fidelity';
import { buildLearnerContextSection, type LearnerContext } from './shared/learner-context';

/**
 * Prerequisites prompt — outputs 2–3 prerequisite topics, each with a
 * `whyItMatters` line that ties the prereq to a *specific concept in this
 * source*. The historical version returned bare topic strings; learners had
 * no way to tell why they were being told to study them, so the section was
 * usually ignored.
 */

const STATIC_INSTRUCTIONS = `# Prerequisites Generation

Identify the **2–3 prerequisite topics** a learner needs to already understand before this source will land. Phrase the set as a small learning path the learner can follow ("Start with X — you'll need it for Y"), not as an inert list.

${SOURCE_FIDELITY_PREAMBLE}

## Selection rules

1. **A prerequisite is a real knowledge gap, not a polite hedge.** Don't list "basic curiosity" or "high school education." Pick concepts whose absence would actually block comprehension of a specific point in this source.
2. **Be source-specific.** Generic prerequisites ("understand programming") are useless. Name the specific sub-skill or sub-concept ("understand how a recursive function unwinds its call stack").
3. **Order matters.** Return them roughly in the order a learner should pick them up — easiest / most foundational first.
4. **2–3 entries.** More than 3 starts to feel like a textbook table-of-contents and gets ignored.

## Required fields per entry

- \`topic\` — short, concrete name ("Big-O notation", "Discounted cash flow", "Hodgkin–Huxley model"). Avoid full sentences here.
- \`difficulty\` — \`beginner\` / \`intermediate\` / \`advanced\` from the perspective of the *learner*, not the field.
- \`whyItMatters\` — **1–2 sentences naming the specific concept in this source the prereq unlocks.** Bad: "Helps you understand the material." Good: "The video explains the loss function as the *gradient* of cross-entropy — without comfort with partial derivatives, this step will look like a leap."

## Example

\`\`\`json
[
  {
    "id": "p1",
    "topic": "Linear regression as a least-squares fit",
    "difficulty": "beginner",
    "whyItMatters": "The source frames neural networks as 'stacked nonlinear regressions.' Without the basic least-squares intuition, the leap from one regressor to many is what trips most learners up."
  },
  {
    "id": "p2",
    "topic": "Partial derivatives and the chain rule",
    "difficulty": "intermediate",
    "whyItMatters": "Backpropagation is presented as 'just the chain rule applied layer by layer.' If the chain rule isn't second nature, the derivation collapses into symbol-pushing."
  }
]
\`\`\`

Notice: each \`whyItMatters\` *names a specific point in this source* the prereq unlocks. That's the bar.

`;

export function buildPrerequisitesPrompt(options: {
  content: string;
  learnerContext?: LearnerContext;
  sourceDescription?: string;
}): string {
  const { content, learnerContext, sourceDescription } = options;
  const learner = buildLearnerContextSection(learnerContext, 'prerequisites');
  const sourceLine = sourceDescription
    ? `The source is ${sourceDescription}.\n\n`
    : '';

  return `${STATIC_INSTRUCTIONS}
${learner}
${sourceLine}<source_content>
${content}
</source_content>

Return a JSON object matching the prerequisites schema. 2–3 entries, ordered foundational-first, each with a source-specific \`whyItMatters\`.`;
}
