export const LEARNING_MATERIALS_SCHEMA = {
  type: 'object',
  properties: {
    flashcards: { type: 'array' },
    quizzes: { type: 'array' },
    timestamps: { type: 'array' },
    prerequisites: { type: 'array' },
    chatbotContext: { type: 'string' },
  },
  required: ['flashcards', 'quizzes', 'timestamps', 'prerequisites', 'chatbotContext'],
} as const;

export interface LearningMaterials {
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


