/**
 * Test Helpers and Utilities
 * Shared utilities for testing across the Clarity AI application
 */

import { render, RenderOptions } from '@testing-library/react'
import { ReactElement } from 'react'

// Mock user data for tests
export const mockUser = {
  _id: '507f1f77bcf86cd799439011',
  email: 'test@example.com',
  firstName: 'Test',
  lastName: 'User',
  password: 'hashedPassword123',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
}

// Mock video data for tests
export const mockVideo = {
  _id: '507f1f77bcf86cd799439012',
  userId: mockUser._id,
  youtubeUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
  videoId: 'dQw4w9WgXcQ',
  title: 'Introduction to Machine Learning',
  description: 'A comprehensive introduction to ML concepts',
  thumbnailUrl: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/maxresdefault.jpg',
  duration: 1800,
  channelName: 'Tech Education',
  transcript: 'This is a test transcript...',
  createdAt: new Date('2024-01-01'),
  processedAt: new Date('2024-01-01'),
  status: 'completed',
}

// Mock flashcards for tests
export const mockFlashcards = [
  {
    _id: '507f1f77bcf86cd799439013',
    videoId: mockVideo._id,
    userId: mockUser._id,
    front: 'What is supervised learning?',
    back: 'A type of machine learning where the model is trained on labeled data.',
    difficulty: 'medium',
    mastered: false,
    reviewCount: 0,
    lastReviewed: null,
    createdAt: new Date('2024-01-01'),
  },
  {
    _id: '507f1f77bcf86cd799439014',
    videoId: mockVideo._id,
    userId: mockUser._id,
    front: 'What is unsupervised learning?',
    back: 'A type of machine learning where the model finds patterns in unlabeled data.',
    difficulty: 'hard',
    mastered: false,
    reviewCount: 0,
    lastReviewed: null,
    createdAt: new Date('2024-01-01'),
  },
]

// Mock quiz data for tests
export const mockQuiz = {
  _id: '507f1f77bcf86cd799439015',
  videoId: mockVideo._id,
  userId: mockUser._id,
  questions: [
    {
      question: 'What does ML stand for?',
      type: 'multiple-choice',
      options: ['Machine Learning', 'Manual Labor', 'Modern Language', 'Math Logic'],
      correctAnswer: 'Machine Learning',
      explanation: 'ML is the abbreviation for Machine Learning.',
    },
    {
      question: 'Is deep learning a subset of machine learning?',
      type: 'true-false',
      correctAnswer: 'true',
      explanation: 'Deep learning is indeed a specialized subset of machine learning.',
    },
  ],
  createdAt: new Date('2024-01-01'),
}

// Mock learning materials
export const mockLearningMaterials = {
  _id: '507f1f77bcf86cd799439016',
  videoId: mockVideo._id,
  userId: mockUser._id,
  flashcards: mockFlashcards,
  quiz: mockQuiz,
  timestamps: [
    {
      time: 0,
      label: 'Introduction',
      description: 'Overview of machine learning concepts',
    },
    {
      time: 300,
      label: 'Supervised Learning',
      description: 'Detailed explanation of supervised learning',
    },
  ],
  prerequisites: {
    required: ['Basic Python', 'Statistics fundamentals'],
    recommended: ['Linear Algebra', 'Calculus'],
  },
  mindMap: {
    nodes: [
      { id: '1', label: 'Machine Learning', level: 0 },
      { id: '2', label: 'Supervised Learning', level: 1, parent: '1' },
      { id: '3', label: 'Unsupervised Learning', level: 1, parent: '1' },
    ],
    edges: [
      { source: '1', target: '2' },
      { source: '1', target: '3' },
    ],
  },
  createdAt: new Date('2024-01-01'),
}

// Mock chat conversation
export const mockChatConversation = {
  _id: '507f1f77bcf86cd799439017',
  videoId: mockVideo._id,
  userId: mockUser._id,
  messages: [
    {
      role: 'user',
      content: 'Can you explain supervised learning?',
      timestamp: new Date('2024-01-01T10:00:00Z'),
    },
    {
      role: 'assistant',
      content: 'Supervised learning is a machine learning approach where...',
      timestamp: new Date('2024-01-01T10:00:05Z'),
    },
  ],
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
}

// Mock dashboard stats
export const mockDashboardStats = {
  totalVideos: 15,
  totalFlashcards: 120,
  quizzesCompleted: 8,
  averageQuizScore: 85,
  studyStreak: 7,
  totalStudyTime: 3600,
  masteredFlashcards: 45,
}

// Mock activity log
export const mockActivityLog = [
  {
    _id: '507f1f77bcf86cd799439018',
    userId: mockUser._id,
    activityType: 'video_processed',
    videoId: mockVideo._id,
    metadata: { videoTitle: mockVideo.title },
    timestamp: new Date('2024-01-01T10:00:00Z'),
  },
  {
    _id: '507f1f77bcf86cd799439019',
    userId: mockUser._id,
    activityType: 'quiz_completed',
    videoId: mockVideo._id,
    metadata: { score: 90, totalQuestions: 10 },
    timestamp: new Date('2024-01-01T11:00:00Z'),
  },
]

// Mock JWT token
export const mockJWT = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI1MDdmMWY3N2JjZjg2Y2Q3OTk0MzkwMTEiLCJlbWFpbCI6InRlc3RAZXhhbXBsZS5jb20iLCJpYXQiOjE2NDU0NTQ0MDAsImV4cCI6MTY0NTU0MDgwMH0.fake-signature'

// Custom render function with providers
export const renderWithProviders = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => {
  return render(ui, { ...options })
}

// Utility to wait for async operations
export const waitForAsync = () => new Promise((resolve) => setTimeout(resolve, 0))

// Mock fetch responses
export const mockFetchSuccess = (data: any) => {
  global.fetch = jest.fn(() =>
    Promise.resolve({
      ok: true,
      status: 200,
      json: async () => ({ success: true, data }),
      text: async () => JSON.stringify({ success: true, data }),
    } as Response)
  )
}

export const mockFetchError = (message: string, status = 400) => {
  global.fetch = jest.fn(() =>
    Promise.resolve({
      ok: false,
      status,
      json: async () => ({ success: false, error: message }),
      text: async () => JSON.stringify({ success: false, error: message }),
    } as Response)
  )
}

// Mock localStorage
export const mockLocalStorage = () => {
  const store: Record<string, string> = {}

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value
    },
    removeItem: (key: string) => {
      delete store[key]
    },
    clear: () => {
      Object.keys(store).forEach((key) => delete store[key])
    },
  }
}

// Mock MongoDB connection
export const mockMongoConnection = () => ({
  connect: jest.fn(),
  disconnect: jest.fn(),
  connection: {
    readyState: 1, // connected
  },
})

// Mock Groq SDK
export const mockGroqResponse = (content: any) => ({
  choices: [
    {
      message: {
        content: JSON.stringify(content),
        role: 'assistant',
      },
      finish_reason: 'stop',
    },
  ],
  usage: {
    prompt_tokens: 100,
    completion_tokens: 200,
    total_tokens: 300,
  },
})

// Mock YouTube transcript
export const mockYouTubeTranscript = [
  {
    text: 'Welcome to this introduction to machine learning.',
    offset: 0,
    duration: 5000,
  },
  {
    text: 'In this video, we will cover supervised and unsupervised learning.',
    offset: 5000,
    duration: 5000,
  },
  {
    text: 'Let\'s start with the fundamentals.',
    offset: 10000,
    duration: 3000,
  },
]
