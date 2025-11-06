/**
 * Integration Tests - End-to-End User Flows
 * Tests for complete user journeys through the Clarity AI application
 */

import { mockUser, mockVideo } from '../utils/test-helpers'

jest.mock('@/lib/mongodb')
jest.mock('@/lib/models/User')
jest.mock('@/lib/models/Video')
jest.mock('@/lib/models/LearningMaterial')
jest.mock('@/lib/transcript')
jest.mock('@/lib/llm')

describe('User Flow Integration Tests', () => {
  describe('New User Onboarding Flow', () => {
    it('should complete full signup to first video processing flow', async () => {
      // 1. User signs up
      const signupResponse = await fetch('/api/auth/signup', {
        method: 'POST',
        body: JSON.stringify({
          email: 'newuser@example.com',
          password: 'SecurePass123!',
          firstName: 'New',
          lastName: 'User',
        }),
      })
      const signupData = await signupResponse.json()
      expect(signupData.success).toBe(true)

      const token = signupData.data.token

      // 2. User submits first video
      const videoResponse = await fetch('/api/videos/process', {
        method: 'POST',
        headers: {
          Cookie: `token=${token}`,
        },
        body: JSON.stringify({
          youtubeUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        }),
      })
      const videoData = await videoResponse.json()
      expect(videoData.success).toBe(true)
      expect(videoData.data.video.status).toBe('completed')

      // 3. User views generated materials
      const materialsResponse = await fetch(
        `/api/videos/${videoData.data.video._id}/materials`,
        {
          headers: {
            Cookie: `token=${token}`,
          },
        }
      )
      const materialsData = await materialsResponse.json()
      expect(materialsData.success).toBe(true)
      expect(materialsData.data.materials.flashcards.length).toBeGreaterThan(0)
      expect(materialsData.data.materials.quiz).toBeDefined()

      // 4. User checks dashboard stats
      const statsResponse = await fetch('/api/dashboard/stats', {
        headers: {
          Cookie: `token=${token}`,
        },
      })
      const statsData = await statsResponse.json()
      expect(statsData.success).toBe(true)
      expect(statsData.data.stats.totalVideos).toBe(1)
    }, 30000) // 30 second timeout
  })

  describe('Complete Learning Session Flow', () => {
    it('should complete video processing → flashcard study → quiz → chatbot flow', async () => {
      const token = 'valid-jwt-token' // Mock authenticated user

      // 1. Process video
      const videoResponse = await fetch('/api/videos/process', {
        method: 'POST',
        headers: { Cookie: `token=${token}` },
        body: JSON.stringify({
          youtubeUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        }),
      })
      const videoData = await videoResponse.json()
      const videoId = videoData.data.video._id

      // 2. Study flashcards
      const flashcardsResponse = await fetch(
        `/api/learning/userFlashcards?videoId=${videoId}`,
        {
          headers: { Cookie: `token=${token}` },
        }
      )
      const flashcardsData = await flashcardsResponse.json()
      expect(flashcardsData.data.flashcards.length).toBeGreaterThan(0)

      // Mark a flashcard as reviewed
      const flashcardId = flashcardsData.data.flashcards[0]._id
      await fetch('/api/learning/flashcards/progress', {
        method: 'POST',
        headers: { Cookie: `token=${token}` },
        body: JSON.stringify({
          flashcardId,
          correct: true,
        }),
      })

      // 3. Complete quiz
      const quizResponse = await fetch('/api/learning/quizzes/submit', {
        method: 'POST',
        headers: { Cookie: `token=${token}` },
        body: JSON.stringify({
          videoId,
          answers: [
            { questionIndex: 0, answer: 'Machine Learning' },
            { questionIndex: 1, answer: 'true' },
          ],
        }),
      })
      const quizData = await quizResponse.json()
      expect(quizData.success).toBe(true)
      expect(quizData.data.result.score).toBeGreaterThanOrEqual(0)

      // 4. Ask chatbot a question
      const chatResponse = await fetch('/api/chatbot/ask', {
        method: 'POST',
        headers: { Cookie: `token=${token}` },
        body: JSON.stringify({
          videoId,
          question: 'Can you explain this concept further?',
        }),
      })
      const chatData = await chatResponse.json()
      expect(chatData.success).toBe(true)
      expect(chatData.data.answer).toBeTruthy()

      // 5. Verify activity was logged
      const activityResponse = await fetch('/api/dashboard/activity', {
        headers: { Cookie: `token=${token}` },
      })
      const activityData = await activityResponse.json()
      expect(activityData.data.activities.length).toBeGreaterThan(0)
    }, 30000)
  })

  describe('Multi-Video Study Session Flow', () => {
    it('should process multiple videos and track progress across all', async () => {
      const token = 'valid-jwt-token'

      const videoUrls = [
        'https://www.youtube.com/watch?v=video1',
        'https://www.youtube.com/watch?v=video2',
        'https://www.youtube.com/watch?v=video3',
      ]

      const processedVideos = []

      // Process multiple videos
      for (const url of videoUrls) {
        const response = await fetch('/api/videos/process', {
          method: 'POST',
          headers: { Cookie: `token=${token}` },
          body: JSON.stringify({ youtubeUrl: url }),
        })
        const data = await response.json()
        processedVideos.push(data.data.video)
      }

      // Verify all videos in gallery
      const galleryResponse = await fetch('/api/videos', {
        headers: { Cookie: `token=${token}` },
      })
      const galleryData = await galleryResponse.json()
      expect(galleryData.data.videos.length).toBeGreaterThanOrEqual(3)

      // Check dashboard reflects all videos
      const statsResponse = await fetch('/api/dashboard/stats', {
        headers: { Cookie: `token=${token}` },
      })
      const statsData = await statsResponse.json()
      expect(statsData.data.stats.totalVideos).toBeGreaterThanOrEqual(3)
    }, 60000)
  })

  describe('Custom Flashcard Creation Flow', () => {
    it('should allow users to create and study custom flashcards', async () => {
      const token = 'valid-jwt-token'

      // Process a video first
      const videoResponse = await fetch('/api/videos/process', {
        method: 'POST',
        headers: { Cookie: `token=${token}` },
        body: JSON.stringify({
          youtubeUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        }),
      })
      const videoData = await videoResponse.json()
      const videoId = videoData.data.video._id

      // Create custom flashcard (generation effect)
      const createResponse = await fetch('/api/learning/userFlashcards', {
        method: 'POST',
        headers: { Cookie: `token=${token}` },
        body: JSON.stringify({
          videoId,
          front: 'What is the key concept I learned?',
          back: 'My own explanation in my own words',
          difficulty: 'medium',
        }),
      })
      const createData = await createResponse.json()
      expect(createData.success).toBe(true)

      const customFlashcardId = createData.data.flashcard._id

      // Retrieve all flashcards (AI-generated + user-created)
      const allFlashcardsResponse = await fetch(
        `/api/learning/userFlashcards?videoId=${videoId}`,
        {
          headers: { Cookie: `token=${token}` },
        }
      )
      const allFlashcardsData = await allFlashcardsResponse.json()
      const hasCustomCard = allFlashcardsData.data.flashcards.some(
        (card: any) => card._id === customFlashcardId
      )
      expect(hasCustomCard).toBe(true)

      // Study the custom flashcard
      const progressResponse = await fetch('/api/learning/flashcards/progress', {
        method: 'POST',
        headers: { Cookie: `token=${token}` },
        body: JSON.stringify({
          flashcardId: customFlashcardId,
          correct: true,
        }),
      })
      const progressData = await progressResponse.json()
      expect(progressData.success).toBe(true)
      expect(progressData.data.flashcard.reviewCount).toBeGreaterThan(0)
    }, 30000)
  })

  describe('Prerequisite Check and Learning Flow', () => {
    it('should check prerequisites and use chatbot for gaps', async () => {
      const token = 'valid-jwt-token'

      // Process video
      const videoResponse = await fetch('/api/videos/process', {
        method: 'POST',
        headers: { Cookie: `token=${token}` },
        body: JSON.stringify({
          youtubeUrl: 'https://www.youtube.com/watch?v=advanced-ml',
        }),
      })
      const videoData = await videoResponse.json()
      const videoId = videoData.data.video._id

      // Get learning materials with prerequisites
      const materialsResponse = await fetch(`/api/videos/${videoId}/materials`, {
        headers: { Cookie: `token=${token}` },
      })
      const materialsData = await materialsResponse.json()
      const prerequisites = materialsData.data.materials.prerequisites

      expect(prerequisites).toHaveProperty('required')
      expect(prerequisites).toHaveProperty('recommended')

      // User identifies gap in prerequisites, asks chatbot
      const chatResponse = await fetch('/api/chatbot/ask', {
        method: 'POST',
        headers: { Cookie: `token=${token}` },
        body: JSON.stringify({
          videoId,
          question: `Can you explain ${prerequisites.required[0]}?`,
        }),
      })
      const chatData = await chatResponse.json()
      expect(chatData.success).toBe(true)
      expect(chatData.data.answer).toBeTruthy()
    }, 30000)
  })

  describe('Progress Tracking Over Time', () => {
    it('should track study streak and statistics accurately', async () => {
      const token = 'valid-jwt-token'

      // Day 1: Process video and study
      await fetch('/api/activity/log', {
        method: 'POST',
        headers: { Cookie: `token=${token}` },
        body: JSON.stringify({
          activityType: 'video_processed',
          videoId: 'video1',
          metadata: { videoTitle: 'ML Basics' },
        }),
      })

      // Day 2: Quiz completion
      await fetch('/api/activity/log', {
        method: 'POST',
        headers: { Cookie: `token=${token}` },
        body: JSON.stringify({
          activityType: 'quiz_completed',
          videoId: 'video1',
          metadata: { score: 85 },
        }),
      })

      // Day 3: Flashcard review
      await fetch('/api/activity/log', {
        method: 'POST',
        headers: { Cookie: `token=${token}` },
        body: JSON.stringify({
          activityType: 'flashcard_reviewed',
          videoId: 'video1',
          metadata: { correct: true },
        }),
      })

      // Check stats reflect 3-day streak
      const statsResponse = await fetch('/api/dashboard/stats', {
        headers: { Cookie: `token=${token}` },
      })
      const statsData = await statsResponse.json()

      expect(statsData.data.stats.studyStreak).toBeGreaterThanOrEqual(1)

      // Check activity heatmap
      const heatmapResponse = await fetch('/api/dashboard/activity-heatmap', {
        headers: { Cookie: `token=${token}` },
      })
      const heatmapData = await heatmapResponse.json()
      expect(heatmapData.data.heatmap.length).toBeGreaterThan(0)
    })
  })

  describe('Authentication Persistence Flow', () => {
    it('should maintain session across requests', async () => {
      // Sign in
      const signinResponse = await fetch('/api/auth/signin', {
        method: 'POST',
        body: JSON.stringify({
          email: mockUser.email,
          password: 'CorrectPassword123!',
          rememberMe: true,
        }),
      })
      const signinData = await signinResponse.json()
      expect(signinData.success).toBe(true)

      const token = signinResponse.headers.get('Set-Cookie')?.match(/token=([^;]+)/)?.[1]

      // Make authenticated request
      const meResponse = await fetch('/api/auth/me', {
        headers: {
          Cookie: `token=${token}`,
        },
      })
      const meData = await meResponse.json()
      expect(meData.success).toBe(true)
      expect(meData.data.user.email).toBe(mockUser.email)

      // Logout
      const logoutResponse = await fetch('/api/auth/logout', {
        method: 'POST',
        headers: {
          Cookie: `token=${token}`,
        },
      })
      expect(logoutResponse.status).toBe(200)

      // Verify session is cleared
      const meResponse2 = await fetch('/api/auth/me', {
        headers: {
          Cookie: `token=${token}`,
        },
      })
      expect(meResponse2.status).toBe(401)
    })
  })

  describe('Error Recovery Flow', () => {
    it('should handle and recover from errors gracefully', async () => {
      const token = 'valid-jwt-token'

      // Attempt to process invalid video
      const invalidVideoResponse = await fetch('/api/videos/process', {
        method: 'POST',
        headers: { Cookie: `token=${token}` },
        body: JSON.stringify({
          youtubeUrl: 'https://invalid-url.com/video',
        }),
      })
      expect(invalidVideoResponse.status).toBe(400)

      // User can still use the app - check dashboard
      const statsResponse = await fetch('/api/dashboard/stats', {
        headers: { Cookie: `token=${token}` },
      })
      expect(statsResponse.status).toBe(200)

      // Process valid video after error
      const validVideoResponse = await fetch('/api/videos/process', {
        method: 'POST',
        headers: { Cookie: `token=${token}` },
        body: JSON.stringify({
          youtubeUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        }),
      })
      expect(validVideoResponse.status).toBe(200)
    })
  })
})
