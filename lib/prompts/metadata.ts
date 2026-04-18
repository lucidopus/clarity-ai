import { SOURCE_FIDELITY_PREAMBLE } from './shared/source-fidelity';
import { buildLearnerContextSection, type LearnerContext } from './shared/learner-context';
import { VIDEO_CATEGORIES } from '../config';

/**
 * Metadata prompt — title, category, tags, and chapters. These are the
 * "spine" the rest of the UI hangs off (sidebar listing, search, chapter
 * navigation), so the rules emphasize *retrievability* over flair: a search
 * for "calculus chain rule" should hit a video with those tags, even if the
 * speaker's preferred label is "implicit differentiation."
 */

const STATIC_INSTRUCTIONS = `# Metadata Generation

Generate the navigational metadata for this source: title, category, tags, and chapters. These fields drive search, sidebars, and chapter navigation — they are not vibes. Optimize for the learner who will scroll a list of 50 sources looking for the right one.

${SOURCE_FIDELITY_PREAMBLE}

## Title

- **Concise (≤ 70 chars), descriptive, and specific.** Avoid clickbait.
- Should make sense out of context — a learner glancing at their library should know what they get.
- Prefer the source's own framing of the topic when it's clear; reword only if the original is misleading or absent.
- ✅ "How transformer attention actually works"
- ✅ "Discounted cash flow basics for early-stage founders"
- ❌ "Amazing video!" (no information)
- ❌ "Lecture 14"  (only meaningful in original course context)

## Category

Choose **exactly one** from this fixed list (do not invent):
${VIDEO_CATEGORIES.map((c) => `- ${c}`).join('\n')}

If the source spans multiple categories, pick the one that best matches the source's *primary* angle, not the broadest possible bucket.

## Tags

- **5–8 tags**, all lowercase.
- Each tag is a search term a learner would actually type — concrete, not abstract.
- Use specific names of techniques, frameworks, people, or concepts ("backpropagation", "next.js", "pomodoro technique", "amortized cost", "hodgkin-huxley").
- Avoid mega-broad tags ("learning", "education", "interesting"). They match everything and help no one.
- Prefer the *vocabulary the field uses* over the speaker's idiosyncratic label.

## Chapters

3–5 chapters covering the major sections of the source.

- Each \`topic\` is a short concept-driven name (Title Case, ≤ 60 chars). NOT "Section 1" or "Introduction."
- Each \`description\` is one sentence (≤ 25 words) summarizing what happens in that chapter.
- Set \`timeSeconds\` if the source has timestamps (videos / audio); set \`page\` if it has page numbers (PDFs / documents). Set neither if the source has neither.
- Chapters should be *roughly evenly distributed* across the source — don't put all four in the first 10% of a 60-min lecture.

## Example chapter

\`\`\`json
{
  "id": "c2",
  "timeSeconds": 612,
  "topic": "Why the Chain Rule Falls Out of Composition",
  "description": "Builds intuition for why d/dx[f(g(x))] equals f'(g(x))·g'(x) using a thermometer-temperature example."
}
\`\`\`

`;

export function buildMetadataPrompt(options: {
  content: string;
  hasTimestamps: boolean;
  hasPages: boolean;
  learnerContext?: LearnerContext;
  sourceDescription?: string;
}): string {
  const { content, hasTimestamps, hasPages, learnerContext, sourceDescription } = options;
  const learner = buildLearnerContextSection(learnerContext, 'metadata');
  const sourceLine = sourceDescription
    ? `The source is ${sourceDescription}.\n\n`
    : '';

  let chapterMarkerNote = '';
  if (hasTimestamps) {
    chapterMarkerNote = 'This source has timestamps — every chapter MUST include a `timeSeconds` field pointing to its start.';
  } else if (hasPages) {
    chapterMarkerNote = 'This source has page numbers — every chapter MUST include a `page` field.';
  } else {
    chapterMarkerNote = 'This source has neither timestamps nor pages — chapters should omit `timeSeconds` and `page`.';
  }

  return `${STATIC_INSTRUCTIONS}
${learner}
${sourceLine}<source_content>
${content}
</source_content>

${chapterMarkerNote}

Return a JSON object with \`title\`, \`category\`, \`tags\`, and \`chapters\` fields matching the schema.`;
}
