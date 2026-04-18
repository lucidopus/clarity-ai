/**
 * Smoke tests for the per-artifact prompt builders.
 *
 * These don't validate the *content* of each prompt (that's pedagogical
 * judgement and lives in the prompt review). They guarantee the structural
 * contract every builder must keep:
 *   - returns a non-empty string,
 *   - includes the source-fidelity preamble (anti-hallucination guardrails),
 *   - injects the source content the caller passed in,
 *   - applies the learner context block when one is provided.
 */

import {
  buildFlashcardsPrompt,
  buildQuizzesPrompt,
  buildMindMapPrompt,
  buildPrerequisitesPrompt,
  buildCaseStudyPrompt,
  buildSummaryPrompt,
  buildMetadataPrompt,
  buildContentValidatorPrompt,
  buildClaraSystemPrompt,
  buildFlashcardsCriticPrompt,
  buildFlashcardsRegenerationAddendum,
  LIVE_LECTURE_QA_PROMPT,
  EXPLAIN_LAST_2_MIN_PROMPT,
  SOURCE_FIDELITY_PREAMBLE,
  type LearnerContext,
  type ClaraPromptContext,
  type FlashcardsCritique,
  type FlashcardForCritic,
} from '@/lib/prompts';

const SAMPLE_SOURCE = 'A neural network is a function approximator built from layers of weighted sums.';
const FIDELITY_FINGERPRINT = 'Stay inside the source';

const LEARNER: LearnerContext = {
  role: 'Undergraduate',
  learningGoals: ['pass ML midterm'],
  learningChallenges: ['retention'],
  selfEfficacy: 2,
  masteryOrientation: 6,
};

const CLARA_CONTEXT: ClaraPromptContext = {
  userProfile: {
    userType: 'Undergraduate',
    firstName: 'Avery',
    learningGoals: ['pass ML midterm'],
    personalityProfile: {
      conscientiousness: 3,
      emotionalStability: 5,
      selfEfficacy: 2,
      masteryOrientation: 6,
      performanceOrientation: 4,
    },
  },
  summary: 'A neural network is a stack of linear layers and nonlinearities.',
  materials: { flashcardCount: 12, quizCount: 8, prerequisiteTopics: ['linear algebra'] },
  sourceTitle: 'Intro to Neural Networks',
  sourceType: 'youtube',
};

describe('per-artifact prompt builders', () => {
  test('SOURCE_FIDELITY_PREAMBLE contains the recognisable fingerprint', () => {
    expect(SOURCE_FIDELITY_PREAMBLE).toContain(FIDELITY_FINGERPRINT);
  });

  describe('artifact builders include fidelity preamble + source content', () => {
    const cases: Array<[string, string]> = [
      ['flashcards', buildFlashcardsPrompt({ content: SAMPLE_SOURCE })],
      ['quizzes', buildQuizzesPrompt({ content: SAMPLE_SOURCE })],
      ['mindmap', buildMindMapPrompt({ content: SAMPLE_SOURCE })],
      ['prerequisites', buildPrerequisitesPrompt({ content: SAMPLE_SOURCE })],
      ['case-study', buildCaseStudyPrompt({ content: SAMPLE_SOURCE })],
      ['summary', buildSummaryPrompt({ content: SAMPLE_SOURCE, densityHint: 'medium' })],
      ['metadata', buildMetadataPrompt({ content: SAMPLE_SOURCE, hasTimestamps: false, hasPages: false })],
    ];

    test.each(cases)('%s prompt is well-formed', (_name, prompt) => {
      expect(typeof prompt).toBe('string');
      expect(prompt.length).toBeGreaterThan(200);
      expect(prompt).toContain(FIDELITY_FINGERPRINT);
      expect(prompt).toContain(SAMPLE_SOURCE);
      expect(prompt).toContain('<source_content>');
    });
  });

  test('learner context, when provided, is injected into the prompt', () => {
    const prompt = buildFlashcardsPrompt({ content: SAMPLE_SOURCE, learnerContext: LEARNER });
    expect(prompt).toContain('Learner context');
    expect(prompt).toContain('Undergraduate');
    expect(prompt).toContain('pass ML midterm');
  });

  test('summary length target shifts with density hint', () => {
    const lo = buildSummaryPrompt({ content: SAMPLE_SOURCE, densityHint: 'low' });
    const hi = buildSummaryPrompt({ content: SAMPLE_SOURCE, densityHint: 'high' });
    expect(lo).not.toEqual(hi);
  });

  test('metadata prompt requires timestamps when source has them', () => {
    const withTs = buildMetadataPrompt({ content: SAMPLE_SOURCE, hasTimestamps: true, hasPages: false });
    const noTs = buildMetadataPrompt({ content: SAMPLE_SOURCE, hasTimestamps: false, hasPages: false });
    expect(withTs).not.toEqual(noTs);
  });

  test('content validator prompt embeds the transcript snippet', () => {
    const prompt = buildContentValidatorPrompt({ transcriptSnippet: SAMPLE_SOURCE });
    expect(typeof prompt).toBe('string');
    expect(prompt).toContain(SAMPLE_SOURCE);
  });
});

describe('Clara chatbot prompts', () => {
  test('main Clara system prompt embeds learner + materials context', () => {
    const prompt = buildClaraSystemPrompt(CLARA_CONTEXT);
    expect(prompt).toContain('Avery');
    expect(prompt).toContain('Intro to Neural Networks');
    expect(prompt).toContain('flashcards');
    expect(prompt).toContain(CLARA_CONTEXT.summary);
  });

  test('live-lecture Q&A prompt embeds transcript + lecture title', () => {
    const prompt = LIVE_LECTURE_QA_PROMPT({
      lectureTitle: 'Lecture 4: Backprop',
      transcriptText: 'Today we will cover the chain rule.',
    });
    expect(prompt).toContain('Lecture 4: Backprop');
    expect(prompt).toContain('Today we will cover the chain rule.');
  });

  test('explain-last-2-min prompt embeds the recent transcript', () => {
    const prompt = EXPLAIN_LAST_2_MIN_PROMPT({
      lectureTitle: 'Lecture 4: Backprop',
      recentTranscriptText: '...so the gradient flows backward through the network.',
    });
    expect(prompt).toContain('catch');
    expect(prompt).toContain('gradient flows backward');
  });

  test('live-lecture Q&A prompt is graceful when transcript is empty', () => {
    const prompt = LIVE_LECTURE_QA_PROMPT({ lectureTitle: 'Lecture 4', transcriptText: '' });
    expect(prompt).toContain('No transcript yet');
  });
});

describe('flashcards critic prompts', () => {
  const SAMPLE_DECK: FlashcardForCritic[] = [
    { id: 'cd_1', question: 'What is ATP?', answer: 'The cell\'s energy currency.', cardType: 'definition', bloomLevel: 'recall', difficulty: 'easy' },
    { id: 'cd_2', question: 'What is ATP?', answer: 'The energy currency of the cell.', cardType: 'definition', bloomLevel: 'recall', difficulty: 'easy' },
    { id: 'cd_3', question: 'How does ATP synthase produce ATP?', answer: 'Protons flow through it, driving rotation that phosphorylates ADP, and the resulting ATP is then exported.', cardType: 'definition', bloomLevel: 'understand', difficulty: 'hard' },
  ];

  test('critic prompt embeds the deck and the source snippet', () => {
    const prompt = buildFlashcardsCriticPrompt({
      flashcards: SAMPLE_DECK,
      sourceSnippet: 'ATP is produced by ATP synthase in the mitochondria.',
    });
    expect(prompt).toContain('cd_1');
    expect(prompt).toContain('What is ATP?');
    expect(prompt).toContain('ATP synthase');
  });

  test('regeneration addendum returns empty string when verdict is pass', () => {
    const critique: FlashcardsCritique = { overallVerdict: 'pass', issues: [] };
    expect(buildFlashcardsRegenerationAddendum(critique)).toBe('');
  });

  test('regeneration addendum surfaces issues + brief when verdict is regenerate', () => {
    const critique: FlashcardsCritique = {
      overallVerdict: 'regenerate',
      issues: [{ cardIds: ['cd_1', 'cd_2'], type: 'duplicate', description: 'Both ask "What is ATP?"' }],
      regenerationGuidance: 'Drop one of cd_1/cd_2; split cd_3 into atomic cards.',
    };
    const addendum = buildFlashcardsRegenerationAddendum(critique);
    expect(addendum).toContain('Critic feedback');
    expect(addendum).toContain('cd_1');
    expect(addendum).toContain('Drop one of cd_1/cd_2');
  });
});
