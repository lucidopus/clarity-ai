import { z } from 'zod';
import { CHATBOT_NAME, VIDEO_CATEGORIES } from './config';

/**
 * Partial Zod Schemas for Chunked Generation
 * These allow generating materials in separate LLM calls so each artifact
 * gets the model's full attention (and so token-limit failures on one
 * artifact don't take down the others).
 *
 * Field shapes MUST stay in sync with `LearningMaterialsSchema` in
 * `./structuredOutput.ts` — that's the single source of truth for the final
 * combined shape; these are just slices of it.
 */

const SourceRefSchema = z.object({
  startTime: z.number().optional(),
  endTime: z.number().optional(),
  page: z.number().int().optional(),
  quote: z.string().optional(),
});

const RichOptionSchema = z.object({
  text: z.string(),
  isCorrect: z.boolean(),
  misconception: z.string().optional(),
});

// Chunk 1: Summary & Metadata
export const VideoMetadataSchema = z.object({
  title: z.string().describe('Concise, descriptive title for the source'),
  category: z.enum(VIDEO_CATEGORIES).describe('The single best category that fits this content'),
  tags: z.array(z.string()).describe('5–8 specific topic keywords. Lowercase.'),
  summary: z.string().describe(`A markdown-formatted summary for ${CHATBOT_NAME} to use as context. Length scales with source density — see prompt.`),
  chapters: z.array(
    z.object({
      id: z.string(),
      timeSeconds: z.number().int().optional(),
      page: z.number().int().optional(),
      topic: z.string(),
      description: z.string(),
    })
  ).describe('Key sections or moments in the content (3–5 chapters)'),
});

// Chunk 2: Flashcards
export const FlashcardsSchema = z.object({
  flashcards: z.array(
    z.object({
      id: z.string(),
      question: z.string(),
      answer: z.string(),
      difficulty: z.enum(['easy', 'medium', 'hard']),
      cardType: z.enum(['definition', 'mechanism', 'discrimination', 'application', 'cloze']),
      bloomLevel: z.enum(['recall', 'understand', 'apply', 'analyze']),
      sourceRef: SourceRefSchema.optional(),
    })
  ).describe('Flashcards (5–15 cards). Mix card types. Each card teaches ONE atomic idea.'),
});

// Chunk 3: Quizzes
export const QuizzesSchema = z.object({
  quizzes: z.array(
    z.object({
      id: z.string(),
      questionText: z.string(),
      richOptions: z.array(RichOptionSchema).min(4).max(4),
      explanation: z.string(),
      difficulty: z.enum(['easy', 'medium', 'hard']),
      bloomLevel: z.enum(['recall', 'understand', 'apply', 'analyze']),
      sourceRef: SourceRefSchema.optional(),
    })
  ).describe('Multiple-choice quiz questions (10–15 questions, balanced difficulty + Bloom mix).'),
});

// Chunk 4: Prerequisites
export const PrerequisitesSchema = z.object({
  prerequisites: z.array(
    z.object({
      id: z.string(),
      topic: z.string(),
      difficulty: z.enum(['beginner', 'intermediate', 'advanced']),
      whyItMatters: z.string(),
    })
  ).describe('Prerequisite topics needed to understand this content (2–3 topics)'),
});

// Chunk 5: Real-world Problems
export const RealWorldProblemsSchema = z.object({
  realWorldProblems: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      scenario: z.string(),
      hints: z.array(z.string()),
    })
  ).describe('Real-world case study applying the source concepts'),
});

// Chunk 6: Mind Map
export const MindMapSchema = z.object({
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
        label: z.string(),
        type: z.enum(['hierarchy', 'causes', 'requires', 'contradicts', 'analogous-to']),
      })
    ),
  }).describe('Hierarchical mind map showing concept relationships'),
});

// Detailed Summary for Chunked Generation (Retry Workflow Only)
export const DetailedSummarySchema = z.object({
  detailedSummary: z.string().describe(
    'Comprehensive 1500–2000 word summary capturing all key information from the transcript. ' +
    'Include: main concepts with detailed explanations, important examples and specific details, ' +
    'technical terminology and definitions, key arguments and supporting evidence, ' +
    'practical applications and use cases, step-by-step processes or workflows, ' +
    'important quotes or data points, and any critical nuances or caveats.'
  ),
});

// Type exports
export type VideoMetadata = z.infer<typeof VideoMetadataSchema>;
export type Flashcards = z.infer<typeof FlashcardsSchema>;
export type Quizzes = z.infer<typeof QuizzesSchema>;
export type Prerequisites = z.infer<typeof PrerequisitesSchema>;
export type RealWorldProblems = z.infer<typeof RealWorldProblemsSchema>;
export type MindMapData = z.infer<typeof MindMapSchema>;
export type DetailedSummary = z.infer<typeof DetailedSummarySchema>;
