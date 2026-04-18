import { z } from 'zod';

/**
 * Flashcards critic — a cheap second-pass quality gate that runs on the
 * generated deck *before* it reaches the learner. The generator is good at
 * producing cards; it is less reliable at noticing when its own cards drift
 * away from the rules (compound answers, miscategorised cardType, two cards
 * that ask the same thing in different words).
 *
 * The critic's only job is to flag those drifts. It does NOT rewrite cards
 * itself — it returns a structured verdict + a regeneration brief that we
 * feed back into the same flashcard generator on a second pass. This keeps
 * the critic prompt tight and the critic model cheap (Flash, not Pro).
 *
 * One regenerate cycle is the budget. If the critic still flags issues on
 * the second pass, we ship the second pass anyway — the alternative
 * (looping) burns tokens for diminishing returns.
 */

export type FlashcardForCritic = {
  id: string;
  question: string;
  answer: string;
  cardType: 'definition' | 'mechanism' | 'discrimination' | 'application' | 'cloze';
  bloomLevel: 'recall' | 'understand' | 'apply' | 'analyze';
  difficulty: 'easy' | 'medium' | 'hard';
};

const CritiqueIssueSchema = z.object({
  cardIds: z
    .array(z.string())
    .min(1)
    .describe('IDs of the affected card(s). For dedup issues, list both/all conflicting cards. For atomicity / mistype, usually one card.'),
  type: z
    .enum(['atomicity', 'cardType', 'duplicate', 'minimum-information', 'orphan', 'interference'])
    .describe(
      'Which rule the card(s) violate. atomicity = answer packs >1 idea; cardType = tagged type does not match the question shape; duplicate = two cards teach the same fact; minimum-information = answer is paragraph-length when a phrase would do; orphan = card cites a fact with no surrounding context in the source; interference = two cards have similar questions but different answers (will confuse the learner).',
    ),
  description: z
    .string()
    .describe('One short sentence naming the specific problem with this/these card(s). Be concrete — quote the offending fragment.'),
});

export const FlashcardsCritiqueSchema = z
  .object({
    overallVerdict: z
      .enum(['pass', 'regenerate'])
      .describe(
        '"pass" if the deck respects the rules well enough to ship. "regenerate" only if there are ≥2 distinct issues OR a single severe one (e.g., a duplicate, a card that is plainly mistagged, or a non-atomic answer with multiple conjoined facts).',
      ),
    issues: z
      .array(CritiqueIssueSchema)
      .describe('Every concrete issue you found. Empty array means a clean pass. Be honest — flagging zero issues on a deck that has them defeats the point of this pass.'),
    regenerationGuidance: z
      .string()
      .optional()
      .describe(
        'When verdict is "regenerate": one short paragraph (≤120 words) telling the next generation pass exactly what to fix — e.g., "split card cd_3 into two atomic cards"; "drop one of cd_5/cd_7, they teach the same fact"; "cd_2 is tagged `definition` but asks for application — re-tag or rewrite as a definition prompt." Omit when verdict is "pass".',
      ),
  })
  .describe('Critic verdict over the deck.');

export type FlashcardsCritique = z.infer<typeof FlashcardsCritiqueSchema>;

const STATIC_CRITIC_INSTRUCTIONS = `# Flashcard Critic

You are a strict reviewer of a flashcard deck a learner is about to study with spaced repetition. The deck has already been generated; your job is to grade it against four rules and return a structured verdict. You do **not** rewrite cards — you decide whether the deck ships, and if not, you write a short brief telling the next generation pass what to fix.

## The four rules you grade against

1. **Atomicity.** One card teaches one fact. If the answer contains "and" linking two distinct ideas (not a single compound concept), flag it. Example bad answer: "ATP is the energy currency of the cell, and it is produced in the mitochondria." → That's two cards.
2. **cardType correctness.** The tagged \`cardType\` must match the question shape. A card asking "What is X?" tagged \`application\` is wrong. A card asking "Given scenario Y, what would happen?" tagged \`definition\` is wrong. Use the taxonomy:
   - \`definition\`: "What is X?" → short factual answer.
   - \`mechanism\`: "How does X work?" → causal chain.
   - \`discrimination\`: "What distinguishes X from Y?" → contrast.
   - \`application\`: "Given scenario Z, what happens / what should you do?"
   - \`cloze\`: fill-in-the-blank with \`{{c1::hidden}}\` markup.
3. **Deduplication.** Two cards must not teach the same fact in slightly different wording. If they do, flag them as a duplicate (verdict: regenerate).
4. **Interference.** Two cards whose **questions** look very similar but whose **answers** are different will get mixed up by the learner. Flag them.

## Verdict policy

- \`pass\` — the deck respects the rules; minor stylistic nits do not warrant regeneration.
- \`regenerate\` — at least one severe issue (duplicate, plain mistype, non-atomic answer) OR ≥2 distinct issues. Only choose \`regenerate\` when the deck would actually be improved by another pass.

When you choose \`regenerate\`, write a \`regenerationGuidance\` brief that names specific card IDs and the specific change needed. Be terse and concrete; avoid restating the rules.

## Be honest

If the deck is clean, return \`pass\` with an empty \`issues\` array. Do not invent issues to justify a regenerate verdict — and do not whitewash a broken deck to avoid the cost of regeneration.
`;

/**
 * Build the critic prompt. Keeps the static instruction block first (cache
 * hits across calls); the deck and source snippet are appended last.
 */
export function buildFlashcardsCriticPrompt(options: {
  flashcards: FlashcardForCritic[];
  sourceSnippet?: string;
}): string {
  const { flashcards, sourceSnippet } = options;

  const deckText = flashcards
    .map((c, i) => {
      return [
        `Card ${i + 1}`,
        `  id:        ${c.id}`,
        `  cardType:  ${c.cardType}`,
        `  bloom:     ${c.bloomLevel}`,
        `  difficulty: ${c.difficulty}`,
        `  Q: ${c.question}`,
        `  A: ${c.answer}`,
      ].join('\n');
    })
    .join('\n\n');

  const sourceBlock = sourceSnippet
    ? `\n\n## Source excerpt (for grounding only — judge the deck against the rules, not the source's completeness)\n\n<source_excerpt>\n${sourceSnippet}\n</source_excerpt>\n`
    : '';

  return `${STATIC_CRITIC_INSTRUCTIONS}
## Deck under review (${flashcards.length} cards)

${deckText}
${sourceBlock}
Return a JSON object matching the critique schema. Be specific — cite card IDs and quote the offending fragment.`;
}

/**
 * Build a generator addendum that feeds the critic's brief back into the
 * flashcard generator's prompt for the regenerate pass. Concatenated AFTER
 * the standard \`buildFlashcardsPrompt\` output, before the source content
 * block, so the generator sees the brief in context but still respects the
 * full instruction set.
 */
export function buildFlashcardsRegenerationAddendum(critique: FlashcardsCritique): string {
  if (critique.overallVerdict !== 'regenerate' || !critique.regenerationGuidance) return '';

  const issueLines = critique.issues
    .map((i) => `- [${i.type}] ${i.cardIds.join(', ')}: ${i.description}`)
    .join('\n');

  return `\n## Critic feedback from the previous pass — apply on this regeneration

A reviewer just graded the previous deck and asked you to regenerate. Specific issues to fix:

${issueLines || '(no per-card issues listed)'}

Reviewer's brief:
${critique.regenerationGuidance}

Produce a fresh deck that resolves these issues while still respecting every rule above.\n`;
}
