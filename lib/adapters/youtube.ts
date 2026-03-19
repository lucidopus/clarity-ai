/**
 * YouTube Output Adapter
 *
 * Shapes raw DB documents into the YouTube-specific API response.
 * This is a pure function — no DB calls.
 */

import type { AdapterInput, YouTubeAdaptedMaterials } from './types';

export function adaptYouTubeMaterials(params: AdapterInput): YouTubeAdaptedMaterials {
  const { video, flashcards, quizzes, learningMaterial, mindMap, progress, isReadOnly, authorUsername } = params;

  // Build mastery lookup sets
  const masteredFlashcardSet = new Set(
    progress?.masteredFlashcardIds?.map(id => id.toString()) || []
  );
  const masteredQuizSet = new Set(
    progress?.masteredQuizIds?.map(id => id.toString()) || []
  );

  // Build quiz attempt lookup
  const latestAttempts = new Map<string, number | undefined>();
  if (progress?.quizAttempts) {
    for (const attempt of progress.quizAttempts) {
      latestAttempts.set(attempt.quizId.toString(), attempt.userAnswerIndex);
    }
  }

  // Determine available materials
  const availableMaterials = {
    flashcards: flashcards.length > 0,
    quizzes: quizzes.length > 0,
    prerequisites: (learningMaterial?.prerequisites?.length ?? 0) > 0,
    mindmap: !!(mindMap && mindMap.nodes && mindMap.nodes.length > 0),
    casestudies: (learningMaterial?.realWorldProblems?.length ?? 0) > 0,
  };

  return {
    sourceType: 'youtube',

    video: {
      id: video._id.toString(),
      sourceId: video.videoId,
      videoId: video.videoId,
      youtubeUrl: video.youtubeUrl || '',
      title: video.title,
      channelName: video.channelName,
      thumbnailUrl: video.thumbnail,
      duration: video.duration
        ? `${Math.floor(video.duration / 60)}:${(video.duration % 60).toString().padStart(2, '0')}`
        : undefined,
      createdAt: video.createdAt,
    },

    flashcards: flashcards.map(fc => ({
      id: fc._id.toString(),
      question: fc.question,
      answer: fc.answer,
      isMastered: masteredFlashcardSet.has(fc._id.toString()),
      isUserCreated: fc.generationType === 'human',
    })),

    quizzes: quizzes.map(quiz => {
      const qId = quiz._id.toString();
      return {
        id: qId,
        questionText: quiz.questionText,
        type: 'multiple-choice',
        options: quiz.options,
        correctAnswerIndex: quiz.correctAnswerIndex,
        explanation: quiz.explanation || '',
        isMastered: masteredQuizSet.has(qId),
        userAnswer: latestAttempts.get(qId),
      };
    }),

    transcript: video.transcript.map(t => ({
      text: t.text,
      start: t.offset,
      duration: t.duration,
    })),

    chapters: learningMaterial?.chapters?.map(chapter => ({
      id: chapter.id,
      timeSeconds: chapter.timeSeconds,
      topic: chapter.topic,
      description: chapter.description,
    })) || [],

    prerequisites: learningMaterial?.prerequisites?.map(prereq => ({
      id: prereq.id,
      title: prereq.topic,
      description: `Understanding of ${prereq.topic} (${prereq.difficulty} level)`,
      required: prereq.difficulty === 'beginner' || prereq.difficulty === 'intermediate',
    })) || [],

    prerequisiteQuiz: [],

    mindMap: mindMap
      ? { nodes: mindMap.nodes, edges: mindMap.edges }
      : { nodes: [], edges: [] },

    realWorldProblems: learningMaterial?.realWorldProblems?.map(problem => ({
      id: problem.id,
      title: problem.title,
      scenario: problem.scenario,
      hints: problem.hints,
    })) || [],

    videoSummary: learningMaterial?.summary || undefined,

    processingStatus: video.processingStatus,
    materialsStatus: video.materialsStatus || 'generating',
    incompleteMaterials: video.incompleteMaterials || [],
    hasAllMaterials: Object.values(availableMaterials).every(v => v),
    availableMaterials,
    error: video.errorMessage ? { type: video.errorType, message: video.errorMessage } : null,

    isReadOnly,
    authorUsername,
  };
}
