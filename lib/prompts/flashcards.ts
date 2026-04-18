import { SOURCE_FIDELITY_PREAMBLE } from './shared/source-fidelity';
import { buildLearnerContextSection, type LearnerContext } from './shared/learner-context';
import { FLASHCARD_EXAMPLES } from './shared/few-shot';

/**
 * Flashcard generation prompt — built from SuperMemo's "20 Rules of
 * Knowledge Formulation." The base model defaults to verbose Q/A definition
 * cards on every concept, which is what makes most AI-generated decks feel
 * like work the learner abandons. The rules below force the model toward
 * atomic, mixed-type cards that actually behave well under spaced repetition.
 *
 * Static instructions go first so the LLM provider's prefix cache hits on
 * them; dynamic content (learner context + source) is appended last.
 */

const STATIC_INSTRUCTIONS = `# Flashcard Generation

You are creating a flashcard deck a learner will actually study with spaced repetition. The single biggest predictor of whether a learner finishes a deck is whether each card respects the **minimum information principle**: one card teaches one atomic idea, answerable in under 3 seconds of recall, with no ambiguity about what's being asked.

${SOURCE_FIDELITY_PREAMBLE}

## Card-quality rules (SuperMemo's 20 Rules, distilled)

1. **Atomic.** One card = one idea. If you find yourself writing "and" in the answer, split the card.
2. **Minimum information.** The answer should be the shortest correct response — one term, one sentence, one short list. If the answer needs a paragraph, you've picked the wrong question.
3. **Concrete over abstract.** Prefer "What enzyme breaks down lactose?" over "Discuss enzymatic digestion." Specifics retrieve; generalities don't.
4. **No orphan cards.** Every card must connect to a concept that appears elsewhere in the deck or in the source. Don't drop in a name with no context.
5. **No interference.** Avoid two cards whose questions look similar but have different answers — the learner will mix them up. Either combine them into a discrimination card or rephrase one.
6. **Bidirectional only when both directions matter.** Only generate the reverse card (e.g., "Mitochondria → ATP" + "ATP-producing organelle → Mitochondria") when both the term and the property are independently useful.
7. **Cloze for sentences with one obvious blank.** When the source has a sentence where one term is the load-bearing fact, prefer a \`cloze\` card over a Q/A: \`"The energy currency of the cell is {{c1::ATP}}."\` Use cloze sparingly — Q/A is better for definitions and mechanisms.
8. **Application cards force depth.** At least one or two cards in the deck should require *using* a concept ("Given X situation, what would you predict?") not just reciting it.
9. **Discrimination cards reduce confusion.** When the source contrasts two similar concepts, generate a card that asks the learner to distinguish them — this is the highest-leverage card type for retention.

## Card-type taxonomy (you must tag each card)

- \`definition\` — "What is X?" → short factual answer.
- \`mechanism\` — "How does X work?" → a step or causal chain in one or two sentences.
- \`discrimination\` — "What distinguishes X from Y?" → contrast card, answer names the dimension(s).
- \`application\` — "Given a scenario, what would happen / what should you do?" → tests whether the concept is usable.
- \`cloze\` — Fill-in-the-blank using \`{{c1::hidden}}\` markup in the question; answer is the unhidden full sentence.

## Bloom's level (you must tag each card)

Most cards should be \`understand\` or \`apply\`, not pure \`recall\`. A deck that's 80% recall is a flashcard deck that gets abandoned in two weeks.

## Deck-level constraints

- 5–15 cards depending on source density. Fewer good cards beat more weak cards.
- Mix of card types: at least 3 types should appear in any deck of 6+ cards.
- Mix of difficulty: include some easy (foundation), some medium, some hard.
- Mix of Bloom levels: at least one \`apply\` or \`analyze\` card.
- For each card, include a \`sourceRef\` pointing to where in the source the fact appears (\`startTime\` for video/audio in seconds, \`page\` for documents, \`quote\` is a short verbatim snippet ≤200 chars). If the source doesn't have timestamps or page numbers, include \`quote\` only.

${FLASHCARD_EXAMPLES}

`;

export function buildFlashcardsPrompt(options: {
  content: string;
  learnerContext?: LearnerContext;
  sourceDescription?: string;
}): string {
  const { content, learnerContext, sourceDescription } = options;
  const learner = buildLearnerContextSection(learnerContext, 'flashcards');
  const sourceLine = sourceDescription
    ? `The source is ${sourceDescription}.\n\n`
    : '';

  return `${STATIC_INSTRUCTIONS}
${learner}
${sourceLine}<source_content>
${content}
</source_content>

Return a JSON object matching the flashcards schema. Apply every rule above.`;
}
