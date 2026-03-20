/**
 * Output Adapter Types
 *
 * Defines the API contract between backend and frontend per source type.
 * Each adapter transforms raw DB documents into a shaped response.
 */

import type { SourceType } from '@/lib/models/Source';

// ─── Source Info (per source type) ──────────────────────────────────────────

export interface BaseSourceInfo {
  id: string;
  sourceId: string;
  title: string;
  thumbnailUrl?: string;
  duration?: string;
  createdAt: Date | string;
}

export interface YouTubeSourceInfo extends BaseSourceInfo {
  videoId: string;
  youtubeUrl: string;
  channelName?: string;
}

// Future: export interface DocumentSourceInfo extends BaseSourceInfo { fileName, pageCount, ... }

// ─── Shared Material Shapes (source-agnostic) ──────────────────────────────

export interface AdaptedFlashcard {
  id: string;
  question: string;
  answer: string;
  isMastered: boolean;
  isUserCreated: boolean;
}

export interface AdaptedQuiz {
  id: string;
  questionText: string;
  type: string;
  options: string[];
  correctAnswerIndex: number;
  explanation: string;
  isMastered: boolean;
  userAnswer?: number;
}

export interface AdaptedChapter {
  id: string;
  topic: string;
  description: string;
  timeSeconds?: number; // YouTube/Audio
  pageNumber?: number;  // Documents (future)
}

export interface AdaptedPrerequisite {
  id: string;
  title: string;
  description: string;
  required: boolean;
}

export interface AdaptedMindMap {
  nodes: Array<{
    id: string;
    label: string;
    type: 'root' | 'concept' | 'subconcept' | 'detail';
    description?: string;
    level: number;
    position?: { x: number; y: number };
  }>;
  edges: Array<{
    id: string;
    source: string;
    target: string;
    label?: string;
    type: 'hierarchy' | 'relation' | 'dependency';
  }>;
}

export interface AdaptedRealWorldProblem {
  id: string;
  title: string;
  scenario: string;
  hints: string[];
}

// ─── Adapted Materials Response (base) ──────────────────────────────────────

export interface BaseAdaptedMaterials {
  sourceType: SourceType;
  video: BaseSourceInfo; // kept as `video` for backward compat; will rename to `source` later
  flashcards: AdaptedFlashcard[];
  quizzes: AdaptedQuiz[];
  chapters: AdaptedChapter[];
  prerequisites: AdaptedPrerequisite[];
  prerequisiteQuiz: unknown[];
  mindMap: AdaptedMindMap;
  realWorldProblems: AdaptedRealWorldProblem[];
  summary?: string;
  processingStatus: string;
  materialsStatus: string;
  incompleteMaterials: string[];
  hasAllMaterials: boolean;
  availableMaterials: {
    flashcards: boolean;
    quizzes: boolean;
    prerequisites: boolean;
    mindmap: boolean;
    casestudies: boolean;
  };
  error: { type?: string; message?: string } | null;
  isReadOnly: boolean;
  authorUsername?: string;
}

// ─── YouTube-specific response ──────────────────────────────────────────────

export interface YouTubeAdaptedMaterials extends BaseAdaptedMaterials {
  sourceType: 'youtube';
  video: YouTubeSourceInfo;
  transcript: Array<{ text: string; start: number; duration: number }>;
}

// ─── Union of all adapted materials ─────────────────────────────────────────

export type AdaptedMaterials = YouTubeAdaptedMaterials;
// Future: | DocumentAdaptedMaterials | AudioAdaptedMaterials | ...

// ─── Adapter function signature ─────────────────────────────────────────────

export type AdapterFunction = (params: AdapterInput) => AdaptedMaterials;

export interface AdapterInput {
  video: {
    _id: { toString(): string };
    videoId: string;
    youtubeUrl?: string;
    title: string;
    channelName?: string;
    thumbnail?: string;
    duration?: number;
    createdAt: Date;
    transcript: Array<{ text: string; offset: number; duration: number }>;
    processingStatus: string;
    materialsStatus?: string;
    incompleteMaterials?: string[];
    errorType?: string;
    errorMessage?: string;
    visibility?: string;
  };
  flashcards: Array<{
    _id: { toString(): string };
    question: string;
    answer: string;
    generationType: string;
  }>;
  quizzes: Array<{
    _id: { toString(): string };
    questionText: string;
    options: string[];
    correctAnswerIndex: number;
    explanation?: string;
  }>;
  learningMaterial: {
    chapters?: Array<{ id: string; timeSeconds: number; topic: string; description: string }>;
    prerequisites?: Array<{ id: string; topic: string; difficulty: string }>;
    realWorldProblems?: Array<{ id: string; title: string; scenario: string; hints: string[] }>;
    summary?: string;
  } | null;
  mindMap: {
    nodes: AdaptedMindMap['nodes'];
    edges: AdaptedMindMap['edges'];
  } | null;
  progress: {
    masteredFlashcardIds?: Array<{ toString(): string }>;
    masteredQuizIds?: Array<{ toString(): string }>;
    quizAttempts?: Array<{ quizId: { toString(): string }; userAnswerIndex?: number }>;
  } | null;
  isReadOnly: boolean;
  authorUsername?: string;
}
