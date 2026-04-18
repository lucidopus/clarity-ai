import { z } from 'zod';
import { CHATBOT_NAME, VIDEO_CATEGORIES } from './config';
import { zodToJsonSchema } from 'zod-to-json-schema';

/**
 * Source pointer attached to a flashcard or quiz so Clara (and the UI) can
 * surface "where in the source did this come from." `quote` is the verbatim
 * span the LLM lifted; `startTime` (seconds) and `page` are present when the
 * underlying source supports them.
 */
const SourceRefSchema = z.object({
  startTime: z.number().optional().describe('Timestamp in seconds where this fact appears in the source (videos/audio).'),
  endTime: z.number().optional().describe('Optional end timestamp in seconds.'),
  page: z.number().int().optional().describe('Page number where this fact appears (PDFs/documents).'),
  quote: z.string().optional().describe('Short verbatim quote (≤200 chars) from the source supporting the card.'),
}).describe('Pointer to where in the source this artifact was derived from.');

/**
 * Quiz option in rich form: text + correctness + the misconception this
 * distractor traps. The misconception explains why a learner might be tempted
 * by this wrong answer — UI surfaces it on a wrong-answer to turn the mistake
 * into a teaching moment. Correct option leaves `misconception` empty.
 */
const RichOptionSchema = z.object({
  text: z.string().describe('The answer choice the learner sees.'),
  isCorrect: z.boolean().describe('True for exactly one option per question.'),
  misconception: z.string().optional().describe('For distractors only: the specific misconception this option traps (e.g., "confuses kinetic with potential energy"). Leave empty for the correct option.'),
});

/**
 * Zod schema for learning materials generation.
 * Provides both runtime validation and TypeScript type inference.
 */
export const LearningMaterialsSchema = z.object({
  title: z.string().describe('Concise, descriptive title for the source'),

  category: z.enum(VIDEO_CATEGORIES).describe('The single best category that fits this content'),

  tags: z.array(z.string())
    .describe('5–8 specific topic keywords (e.g. "next.js", "quantum mechanics", "pomodoro technique"). Lowercase.'),

  flashcards: z.array(
    z.object({
      id: z.string(),
      question: z.string().describe('The prompt the learner sees on the front of the card. For cloze cards, contains "{{c1::hidden}}" markup.'),
      answer: z.string().describe('The answer on the back of the card. For cloze cards, the unhidden full sentence.'),
      difficulty: z.enum(['easy', 'medium', 'hard']),
      cardType: z.enum(['definition', 'mechanism', 'discrimination', 'application', 'cloze'])
        .describe('definition = "what is X"; mechanism = "how does X work"; discrimination = "what distinguishes X from Y"; application = "use X to solve Z"; cloze = fill-in-the-blank.'),
      bloomLevel: z.enum(['recall', 'understand', 'apply', 'analyze'])
        .describe("Bloom's taxonomy level. Push beyond pure recall — most cards should be understand or apply."),
      sourceRef: SourceRefSchema.optional(),
    })
  ).describe('Flashcards covering important concepts (5–15 cards). Mix card types. Each card teaches ONE atomic idea.'),

  quizzes: z.array(
    z.object({
      id: z.string(),
      questionText: z.string(),
      richOptions: z.array(RichOptionSchema)
        .min(4).max(4)
        .describe('Exactly 4 options. Exactly one isCorrect=true. Each distractor has a misconception.'),
      explanation: z.string()
        .describe('Two parts: (1) why the correct answer is correct, grounded in the source; (2) for each distractor, why a learner might pick it AND why it is wrong.'),
      difficulty: z.enum(['easy', 'medium', 'hard']),
      bloomLevel: z.enum(['recall', 'understand', 'apply', 'analyze'])
        .describe("Bloom's taxonomy level. At least 30% of quiz items should be apply or analyze."),
      sourceRef: SourceRefSchema.optional(),
    })
  ).describe('Multiple-choice quiz questions (10–15 questions, balanced difficulty + Bloom mix).'),

  chapters: z.array(
    z.object({
      id: z.string(),
      timeSeconds: z.number().int().optional(),
      page: z.number().int().optional(),
      topic: z.string(),
      description: z.string(),
    })
  ).describe('Key sections or moments in the content (3–5 chapters)'),

  prerequisites: z.array(
    z.object({
      id: z.string(),
      topic: z.string(),
      difficulty: z.enum(['beginner', 'intermediate', 'advanced']),
      whyItMatters: z.string()
        .describe('1–2 sentences explaining why this prerequisite is needed for THIS source — reference a specific concept it unlocks.'),
    })
  ).describe('Prerequisite topics needed to understand this content (2–3 topics)'),

  realWorldProblems: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      scenario: z.string(),
      hints: z.array(z.string()),
    })
  ).describe('Real-world case study applying the source concepts'),

  summary: z.string().describe(`A markdown-formatted summary for ${CHATBOT_NAME} to use as context. Length scales with source density — see prompt.`),

  mindMap: z.object({
    nodes: z.array(
      z.object({
        id: z.string(),
        label: z.string(),
        type: z.enum(['root', 'concept', 'subconcept', 'detail']),
        description: z.string(),
        level: z.number().int(),
      })
    ),
    edges: z.array(
      z.object({
        id: z.string(),
        source: z.string(),
        target: z.string(),
        label: z.string().describe('A short verb-phrase that, read with source→target, forms a sentence ("DNA → composed of → Nucleotides").'),
        type: z.enum(['hierarchy', 'causes', 'requires', 'contradicts', 'analogous-to'])
          .describe('hierarchy = parent-child structural; causes = A leads to B; requires = A is needed for B; contradicts = A and B are in tension; analogous-to = A and B are structurally similar across domains.'),
      })
    ).describe('At least 30% of edges should be non-hierarchy — the map must show real relationships, not just a tree.'),
  }).describe('Hierarchical mind map showing concept relationships'),
});

/**
 * TypeScript type inferred from the Zod schema.
 */
export type LearningMaterials = z.infer<typeof LearningMaterialsSchema>;

/** Convenience type aliases for callers. */
export type Flashcard = LearningMaterials['flashcards'][number];
export type Quiz = LearningMaterials['quizzes'][number];
export type RichOption = z.infer<typeof RichOptionSchema>;
export type SourceRef = z.infer<typeof SourceRefSchema>;

/**
 * JSON Schema version for LLM structured output.
 * Groq and other providers require JSON Schema format.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const LEARNING_MATERIALS_SCHEMA = zodToJsonSchema(LearningMaterialsSchema as any, {
  name: 'learning_materials',
  $refStrategy: 'none', // Inline all definitions
});
