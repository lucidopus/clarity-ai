type Scenario =
  | 'success'
  | 'no-transcript'
  | 'failed-materials'
  | 'network-error';

interface TranscriptSegment {
  text: string;
  start: number;
  duration: number;
}

interface GeneratedMaterials {
  flashcards: Array<{
    id: string;
    question: string;
    answer: string;
    isMastered: boolean;
    generationType: 'ai' | 'human';
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
    title: string;
    startTime: number;
    duration: number;
  }>;
  prerequisites: Array<{
    id: string;
    topic: string;
    difficulty: 'beginner' | 'intermediate' | 'advanced';
  }>;
  chatbotContext: string[];
}

interface TestPipelineResult {
  videoId: string;
  title: string;
  channelName: string;
  thumbnailUrl: string;
  duration: number;
  transcript: TranscriptSegment[];
  materials: GeneratedMaterials;
}

const baseTranscript: TranscriptSegment[] = [
  { text: 'Welcome to the study session.', start: 0, duration: 8 },
  { text: 'We will explore core concepts in detail.', start: 8, duration: 12 },
  { text: 'Summary and next steps.', start: 20, duration: 6 },
];

const baseMaterials: GeneratedMaterials = {
  flashcards: [
    {
      id: 'fc-1',
      question: 'What is the main topic covered?',
      answer: 'The session introduces the primary study concept.',
      isMastered: false,
      generationType: 'ai',
    },
    {
      id: 'fc-2',
      question: 'Name one next step suggested.',
      answer: 'Review advanced resources referenced in the video.',
      isMastered: false,
      generationType: 'ai',
    },
  ],
  quizzes: [
    {
      id: 'quiz-1',
      questionText: 'How is the core concept introduced?',
      options: [
        'Through real-world examples',
        'Via a brief overview',
        'With advanced mathematics',
        'By audience Q&A',
      ],
      correctAnswerIndex: 1,
      explanation: 'The video starts with a concise overview before diving deeper.',
    },
  ],
  timestamps: [
    { id: 'ts-1', title: 'Introduction', startTime: 0, duration: 8 },
    { id: 'ts-2', title: 'Core Concepts', startTime: 8, duration: 12 },
    { id: 'ts-3', title: 'Summary', startTime: 20, duration: 6 },
  ],
  prerequisites: [
    { id: 'pre-1', topic: 'Foundational knowledge', difficulty: 'beginner' },
    { id: 'pre-2', topic: 'Related terminology', difficulty: 'intermediate' },
  ],
  chatbotContext: [
    'User is reviewing generated materials.',
    'Provide clarifications and follow-up resources when asked.',
  ],
};

function buildSuccessResult(youtubeUrl: string): TestPipelineResult {
  const transcriptClone = baseTranscript.map((segment) => ({ ...segment }));
  const materialsClone: GeneratedMaterials = {
    flashcards: baseMaterials.flashcards.map((card) => ({ ...card })),
    quizzes: baseMaterials.quizzes.map((quiz) => ({ ...quiz, options: [...quiz.options] })),
    timestamps: baseMaterials.timestamps.map((timestamp) => ({ ...timestamp })),
    prerequisites: baseMaterials.prerequisites.map((prerequisite) => ({ ...prerequisite })),
    chatbotContext: [...baseMaterials.chatbotContext],
  };

  return {
    videoId: `test-${Math.random().toString(36).slice(2, 8)}`,
    title: 'Test Video Title',
    channelName: 'Clarity AI Labs',
    thumbnailUrl: `https://img.youtube.com/vi/${extractVideoId(youtubeUrl)}/hqdefault.jpg`,
    duration: transcriptClone.reduce((total, item) => total + item.duration, 0),
    transcript: transcriptClone,
    materials: materialsClone,
  };
}

function extractVideoId(url: string): string {
  const match = url.match(/[?&]v=([a-zA-Z0-9_-]{11})/) || url.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
  return match ? match[1] : 'placeholder';
}

export async function processVideoWithScenario(
  youtubeUrl: string,
  scenario: string,
): Promise<TestPipelineResult> {
  const normalizedScenario = scenario as Scenario;

  switch (normalizedScenario) {
    case 'no-transcript':
      throw new Error('No transcript available');
    case 'failed-materials':
      throw new Error('Failed to generate learning materials');
    case 'network-error':
      throw new Error('Network connection failed');
    case 'success':
    default:
      return buildSuccessResult(youtubeUrl);
  }
}
