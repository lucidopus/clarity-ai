import { z } from 'zod';
import { CHATBOT_NAME } from './config';
import { zodToJsonSchema } from 'zod-to-json-schema';

/**
 * Zod schema for learning materials generation.
 * Provides both runtime validation and TypeScript type inference.
 */
export const LearningMaterialsSchema = z.object({
  title: z.string().describe('Concise, descriptive title for the video'),

  flashcards: z.array(
    z.object({
      id: z.string(),
      question: z.string(),
      answer: z.string(),
      difficulty: z.enum(['easy', 'medium', 'hard']),
    })
  ).describe('Flash cards covering important concepts (5-15 cards)'),

  quizzes: z.array(
    z.object({
      id: z.string(),
      questionText: z.string(),
      options: z.array(z.string()),
      correctAnswerIndex: z.number().int(),
      explanation: z.string(),
    })
  ).describe('Multiple-choice quiz questions (10-15 questions)'),

  chapters: z.array(
    z.object({
      id: z.string(),
      timeSeconds: z.number().int(),
      topic: z.string(),
      description: z.string(),
    })
  ).describe('Key moments in the video with time markers (3-5 chapters)'),

  prerequisites: z.array(
    z.object({
      id: z.string(),
      topic: z.string(),
      difficulty: z.enum(['beginner', 'intermediate', 'advanced']),
    })
  ).describe('Prerequisite topics needed to understand this content (2-3 topics)'),

  realWorldProblems: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      scenario: z.string(),
      hints: z.array(z.string()),
    })
  ).describe('Real-world case study applying the video concepts'),

  videoSummary: z.string().describe(`200-300 word summary for ${CHATBOT_NAME} to use as context`),

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
        type: z.enum(['hierarchy', 'relation', 'dependency']),
      })
    ),
  }).describe('Hierarchical mind map showing concept relationships'),
});

/**
 * TypeScript type inferred from the Zod schema.
 * This ensures type safety and eliminates drift between runtime validation and compile-time types.
 */
export type LearningMaterials = z.infer<typeof LearningMaterialsSchema>;

/**
 * JSON Schema version for LLM structured output.
 * Groq and other providers require JSON Schema format.
 */
export const LEARNING_MATERIALS_SCHEMA = zodToJsonSchema(LearningMaterialsSchema, {
  name: 'learning_materials',
  $refStrategy: 'none', // Inline all definitions
});
