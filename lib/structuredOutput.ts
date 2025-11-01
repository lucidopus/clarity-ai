export const LEARNING_MATERIALS_SCHEMA = {
  type: 'object',
  properties: {
    title: { type: 'string' },
    flashcards: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          question: { type: 'string' },
          answer: { type: 'string' },
          difficulty: { type: 'string', enum: ['easy', 'medium', 'hard'] },
        },
        required: ['id', 'question', 'answer', 'difficulty'],
        additionalProperties: false,
      },
    },
    quizzes: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          questionText: { type: 'string' },
          options: { type: 'array', items: { type: 'string' } },
          correctAnswerIndex: { type: 'integer' },
          explanation: { type: 'string' },
        },
        required: ['id', 'questionText', 'options', 'correctAnswerIndex', 'explanation'],
        additionalProperties: false,
      },
    },
    timestamps: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          timeSeconds: { type: 'integer' },
          topic: { type: 'string' },
          description: { type: 'string' },
        },
        required: ['id', 'timeSeconds', 'topic', 'description'],
        additionalProperties: false,
      },
    },
    prerequisites: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          topic: { type: 'string' },
          difficulty: { type: 'string', enum: ['beginner', 'intermediate', 'advanced'] },
        },
        required: ['id', 'topic', 'difficulty'],
        additionalProperties: false,
      },
    },
    chatbotContext: { type: 'string' },
  },
  required: ['title', 'flashcards', 'quizzes', 'timestamps', 'prerequisites', 'chatbotContext'],
  additionalProperties: false,
} as const;

export interface LearningMaterials {
  title: string;
  flashcards: Array<{
    id: string;
    question: string;
    answer: string;
    difficulty: 'easy' | 'medium' | 'hard';
  }>;
  quizzes: Array<{
    id: string;
    questionText: string;
    options: string[];
    correctAnswerIndex: number;
    explanation: string;
  }>;
  timestamps: Array<{
    id: string;
    timeSeconds: number;
    topic: string;
    description: string;
  }>;
  prerequisites: Array<{
    id: string;
    topic: string;
    difficulty: 'beginner' | 'intermediate' | 'advanced';
  }>;
  chatbotContext: string;
}


