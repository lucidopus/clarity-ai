import { SOURCE_FIDELITY_PREAMBLE } from './shared/source-fidelity';
import { buildLearnerContextSection, type LearnerContext } from './shared/learner-context';

/**
 * Summary prompt — produces the canonical markdown summary that doubles as
 * Clara's source context. Length is **density-scaled** so a 5-min explainer
 * gets a tight 200-word summary while a 90-min lecture gets a structured
 * ~1500-word writeup. Without scaling we either over-compress dense sources
 * or pad short ones with filler.
 *
 * The caller computes `densityHint` from word count + segment density and
 * passes it in; the prompt converts that into a target word count.
 */

export type DensityHint = 'low' | 'medium' | 'high';

const TARGET_BY_DENSITY: Record<DensityHint, { words: number; range: string; shape: string }> = {
  low: {
    words: 200,
    range: '180–250 words',
    shape: 'A short overview: one paragraph framing the topic, a few bullet points capturing the 3–5 key takeaways, and one closing sentence on what the learner should walk away knowing.',
  },
  medium: {
    words: 600,
    range: '500–700 words',
    shape: 'A structured writeup: an opening paragraph framing the topic, 3–5 H2 sections covering the main subdivisions, bullets inside sections for sub-points, and a brief closing on key takeaways or open questions.',
  },
  high: {
    words: 1500,
    range: '1300–1700 words',
    shape: 'A comprehensive markdown article: opening paragraph + an H2 per major section + sub-sections (H3) where useful + bulleted lists for enumerations + bolded key terms throughout. Treat it like a reference doc the learner will return to.',
  },
};

const STATIC_INSTRUCTIONS_HEADER = `# Summary Generation

Produce a markdown summary of the source. This summary serves two readers: the **learner** (who will skim it before/after studying) and **Clara, the in-app tutor**, who will use it as context when answering questions. Optimize for both: structured enough that Clara can pull a specific fact, readable enough that a human can scan it in under a minute (for short summaries) or use it as reference (for long ones).

${SOURCE_FIDELITY_PREAMBLE}

## Markdown structure

- Use \`##\` for major sections (named after concepts, not "Section 1").
- Use \`###\` for sub-sections only when they genuinely help.
- **Bold** key terms the first time they appear.
- Use bullets for enumerations or lists of properties; use prose for explanations and reasoning.
- **Use a markdown table when comparing 2+ items along the same dimensions** (e.g., comparing algorithms, frameworks, eras, options). Tables compress comparisons that would otherwise sprawl across paragraphs and are far easier to scan. Aim for 2–4 columns and ≤6 rows per table.
- Use \`>\` blockquotes only for a single highlight quote per major section, if any.
- Do NOT use H1 — the title lives elsewhere.

## Content rules

1. **Lead with the thesis, not the table of contents.** First paragraph names what the source is actually about and why it matters — not "this video covers X, Y, and Z."
2. **Concept-first headings, not chronology.** "Backpropagation" is a heading; "What the speaker said in minute 12" is not.
3. **Preserve concrete examples.** If the source uses a specific worked example or number, include it — Clara loses the ability to reference specifics if the summary scrubs them.
4. **Surface tensions and open questions.** If the source raises a debate, leaves something unresolved, or contrasts two views, note it. Don't smooth them away.
5. **Avoid filler phrases.** No "in conclusion", no "this section discusses", no "the speaker explains that." Just say the thing.

`;

const STATIC_INSTRUCTIONS_FOOTER = `

`;

export function buildSummaryPrompt(options: {
  content: string;
  densityHint: DensityHint;
  learnerContext?: LearnerContext;
  sourceDescription?: string;
}): string {
  const { content, densityHint, learnerContext, sourceDescription } = options;
  const target = TARGET_BY_DENSITY[densityHint];
  const learner = buildLearnerContextSection(learnerContext, 'summary');
  const sourceLine = sourceDescription
    ? `The source is ${sourceDescription}.\n\n`
    : '';

  const lengthSection = `## Target length & shape (this generation)

Density: **${densityHint}** → aim for **${target.range}** (~${target.words} words).

${target.shape}
`;

  return `${STATIC_INSTRUCTIONS_HEADER}${lengthSection}${STATIC_INSTRUCTIONS_FOOTER}
${learner}
${sourceLine}<source_content>
${content}
</source_content>

Return a JSON object with a single \`summary\` field containing the markdown text. Stay within the target word range — quality over hitting the cap exactly.`;
}
