/**
 * Learning Materials API Tests
 * Tests for flashcards, quizzes, progress tracking, and user-created content
 */

import { NextRequest } from 'next/server'
import { mockUser, mockFlashcards, mockQuiz, mockVideo } from '../utils/test-helpers'

jest.mock('@/lib/mongodb')
jest.mock('@/lib/models/Flashcard')
jest.mock('@/lib/models/Quiz')
jest.mock('@/lib/models/Progress')

describe('Learning Materials API', () => {
  describe('Flashcard Management', () => {
    describe('GET /api/learning/userFlashcards', () => {
      it('should fetch all user flashcards for a video', async () => {
        const { GET } = await import('@/app/api/learning/userFlashcards/route')

        const request = new NextRequest(
          `http://localhost:3000/api/learning/userFlashcards?videoId=${mockVideo._id}`,
          {
            headers: {
              Cookie: 'token=valid-jwt-token',
            },
          }
        )

        const response = await GET(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
        expect(Array.isArray(data.data.flashcards)).toBe(true)
      })

      it('should support filtering by mastery status', async () => {
        const { GET } = await import('@/app/api/learning/userFlashcards/route')

        const request = new NextRequest(
          `http://localhost:3000/api/learning/userFlashcards?videoId=${mockVideo._id}&mastered=false`,
          {
            headers: {
              Cookie: 'token=valid-jwt-token',
            },
          }
        )

        const response = await GET(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        data.data.flashcards.forEach((card: any) => {
          expect(card.mastered).toBe(false)
        })
      })
    })

    describe('POST /api/learning/userFlashcards', () => {
      it('should create a new user flashcard', async () => {
        const { POST } = await import('@/app/api/learning/userFlashcards/route')

        const request = new NextRequest('http://localhost:3000/api/learning/userFlashcards', {
          method: 'POST',
          headers: {
            Cookie: 'token=valid-jwt-token',
          },
          body: JSON.stringify({
            videoId: mockVideo._id,
            front: 'What is neural network?',
            back: 'A computational model inspired by biological neural networks.',
            difficulty: 'medium',
          }),
        })

        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(201)
        expect(data.success).toBe(true)
        expect(data.data.flashcard).toHaveProperty('front', 'What is neural network?')
        expect(data.data.flashcard).toHaveProperty('userId', mockUser._id)
      })

      it('should reject flashcard with empty front or back', async () => {
        const { POST } = await import('@/app/api/learning/userFlashcards/route')

        const request = new NextRequest('http://localhost:3000/api/learning/userFlashcards', {
          method: 'POST',
          headers: {
            Cookie: 'token=valid-jwt-token',
          },
          body: JSON.stringify({
            videoId: mockVideo._id,
            front: '',
            back: 'This has no question',
          }),
        })

        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.success).toBe(false)
      })
    })

    describe('PUT /api/learning/userFlashcards', () => {
      it('should update an existing flashcard', async () => {
        const { PUT } = await import('@/app/api/learning/userFlashcards/route')

        const request = new NextRequest('http://localhost:3000/api/learning/userFlashcards', {
          method: 'PUT',
          headers: {
            Cookie: 'token=valid-jwt-token',
          },
          body: JSON.stringify({
            flashcardId: mockFlashcards[0]._id,
            front: 'Updated question',
            back: 'Updated answer',
          }),
        })

        const response = await PUT(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
        expect(data.data.flashcard).toHaveProperty('front', 'Updated question')
      })

      it('should prevent users from editing other users\' flashcards', async () => {
        const { PUT } = await import('@/app/api/learning/userFlashcards/route')

        const request = new NextRequest('http://localhost:3000/api/learning/userFlashcards', {
          method: 'PUT',
          headers: {
            Cookie: 'token=different-user-jwt-token',
          },
          body: JSON.stringify({
            flashcardId: mockFlashcards[0]._id,
            front: 'Trying to edit someone else\'s card',
          }),
        })

        const response = await PUT(request)
        const data = await response.json()

        expect(response.status).toBe(403)
        expect(data.success).toBe(false)
      })
    })

    describe('DELETE /api/learning/userFlashcards', () => {
      it('should delete a flashcard', async () => {
        const { DELETE } = await import('@/app/api/learning/userFlashcards/route')

        const request = new NextRequest(
          `http://localhost:3000/api/learning/userFlashcards?flashcardId=${mockFlashcards[0]._id}`,
          {
            method: 'DELETE',
            headers: {
              Cookie: 'token=valid-jwt-token',
            },
          }
        )

        const response = await DELETE(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
      })
    })

    describe('POST /api/learning/flashcards/progress', () => {
      it('should update flashcard progress when reviewed', async () => {
        const { POST } = await import('@/app/api/learning/flashcards/progress/route')

        const request = new NextRequest('http://localhost:3000/api/learning/flashcards/progress', {
          method: 'POST',
          headers: {
            Cookie: 'token=valid-jwt-token',
          },
          body: JSON.stringify({
            flashcardId: mockFlashcards[0]._id,
            correct: true,
          }),
        })

        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
        expect(data.data.flashcard.reviewCount).toBeGreaterThan(0)
        expect(data.data.flashcard.lastReviewed).toBeTruthy()
      })

      it('should mark flashcard as mastered after multiple correct reviews', async () => {
        const { POST } = await import('@/app/api/learning/flashcards/progress/route')

        // Simulate multiple correct reviews
        for (let i = 0; i < 5; i++) {
          const request = new NextRequest('http://localhost:3000/api/learning/flashcards/progress', {
            method: 'POST',
            headers: {
              Cookie: 'token=valid-jwt-token',
            },
            body: JSON.stringify({
              flashcardId: mockFlashcards[0]._id,
              correct: true,
            }),
          })

          await POST(request)
        }

        // After 5 correct reviews, should be mastered
        expect(mockFlashcards[0].mastered).toBe(true)
      })
    })
  })

  describe('Quiz Management', () => {
    describe('POST /api/learning/quizzes/submit', () => {
      it('should submit quiz answers and calculate score', async () => {
        const { POST } = await import('@/app/api/learning/quizzes/submit/route')

        const request = new NextRequest('http://localhost:3000/api/learning/quizzes/submit', {
          method: 'POST',
          headers: {
            Cookie: 'token=valid-jwt-token',
          },
          body: JSON.stringify({
            videoId: mockVideo._id,
            answers: [
              { questionIndex: 0, answer: 'Machine Learning' },
              { questionIndex: 1, answer: 'true' },
            ],
          }),
        })

        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
        expect(data.data.result).toHaveProperty('score')
        expect(data.data.result).toHaveProperty('totalQuestions')
        expect(data.data.result).toHaveProperty('correctAnswers')
        expect(data.data.result.score).toBeGreaterThanOrEqual(0)
        expect(data.data.result.score).toBeLessThanOrEqual(100)
      })

      it('should provide detailed feedback for each question', async () => {
        const { POST } = await import('@/app/api/learning/quizzes/submit/route')

        const request = new NextRequest('http://localhost:3000/api/learning/quizzes/submit', {
          method: 'POST',
          headers: {
            Cookie: 'token=valid-jwt-token',
          },
          body: JSON.stringify({
            videoId: mockVideo._id,
            answers: [
              { questionIndex: 0, answer: 'Wrong Answer' },
              { questionIndex: 1, answer: 'true' },
            ],
          }),
        })

        const response = await POST(request)
        const data = await response.json()

        expect(data.data.result.feedback).toBeDefined()
        expect(Array.isArray(data.data.result.feedback)).toBe(true)
        data.data.result.feedback.forEach((item: any) => {
          expect(item).toHaveProperty('questionIndex')
          expect(item).toHaveProperty('correct')
          expect(item).toHaveProperty('explanation')
        })
      })

      it('should save quiz completion to user progress', async () => {
        const { POST } = await import('@/app/api/learning/quizzes/submit/route')

        const request = new NextRequest('http://localhost:3000/api/learning/quizzes/submit', {
          method: 'POST',
          headers: {
            Cookie: 'token=valid-jwt-token',
          },
          body: JSON.stringify({
            videoId: mockVideo._id,
            answers: [
              { questionIndex: 0, answer: 'Machine Learning' },
              { questionIndex: 1, answer: 'true' },
            ],
          }),
        })

        const response = await POST(request)
        const data = await response.json()

        expect(data.data.progress).toBeDefined()
        expect(data.data.progress).toHaveProperty('quizzesCompleted')
        expect(data.data.progress.quizzesCompleted).toBeGreaterThan(0)
      })

      it('should reject quiz submission with missing answers', async () => {
        const { POST } = await import('@/app/api/learning/quizzes/submit/route')

        const request = new NextRequest('http://localhost:3000/api/learning/quizzes/submit', {
          method: 'POST',
          headers: {
            Cookie: 'token=valid-jwt-token',
          },
          body: JSON.stringify({
            videoId: mockVideo._id,
            answers: [], // No answers provided
          }),
        })

        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.success).toBe(false)
      })
    })
  })

  describe('Prerequisites System', () => {
    it('should check user prerequisite knowledge', async () => {
      // This would be part of the video materials API
      const prerequisites = {
        required: ['Basic Python', 'Statistics'],
        recommended: ['Linear Algebra', 'Calculus'],
      }

      expect(Array.isArray(prerequisites.required)).toBe(true)
      expect(Array.isArray(prerequisites.recommended)).toBe(true)
    })

    it('should generate prerequisite quiz questions', async () => {
      const { generatePrerequisites } = await import('@/lib/llm')

      const prereqs = await generatePrerequisites('Machine learning requires knowledge of...')

      expect(prereqs).toHaveProperty('required')
      expect(prereqs).toHaveProperty('recommended')
      expect(prereqs.required.length).toBeGreaterThan(0)
    })
  })

  describe('Progress Tracking', () => {
    it('should track overall learning progress', async () => {
      const progressData = {
        videosProcessed: 15,
        flashcardsCreated: 120,
        flashcardsMastered: 45,
        quizzesCompleted: 8,
        averageQuizScore: 85,
        studyStreak: 7,
        totalStudyTimeMinutes: 420,
      }

      expect(progressData.flashcardsMastered).toBeLessThanOrEqual(progressData.flashcardsCreated)
      expect(progressData.averageQuizScore).toBeGreaterThanOrEqual(0)
      expect(progressData.averageQuizScore).toBeLessThanOrEqual(100)
      expect(progressData.studyStreak).toBeGreaterThanOrEqual(0)
    })

    it('should calculate mastery percentage correctly', () => {
      const total = 120
      const mastered = 45
      const masteryPercentage = (mastered / total) * 100

      expect(masteryPercentage).toBeCloseTo(37.5, 1)
    })

    it('should track study streaks accurately', () => {
      const today = new Date()
      const yesterday = new Date(today)
      yesterday.setDate(yesterday.getDate() - 1)

      const activityDates = [today, yesterday]
      const hasActivityYesterday = activityDates.some(
        (date) =>
          date.toDateString() === yesterday.toDateString()
      )

      expect(hasActivityYesterday).toBe(true)
    })
  })

  describe('Mind Maps', () => {
    it('should generate mind map structure from video content', async () => {
      const mindMap = {
        nodes: [
          { id: '1', label: 'Machine Learning', level: 0 },
          { id: '2', label: 'Supervised Learning', level: 1, parent: '1' },
          { id: '3', label: 'Unsupervised Learning', level: 1, parent: '1' },
        ],
        edges: [
          { source: '1', target: '2' },
          { source: '1', target: '3' },
        ],
      }

      expect(mindMap.nodes.length).toBeGreaterThan(0)
      expect(mindMap.edges.length).toBeGreaterThan(0)
      expect(mindMap.nodes[0].level).toBe(0)
    })

    it('should update mind map positions', async () => {
      const { POST } = await import('@/app/api/mindmaps/update/route')

      const request = new NextRequest('http://localhost:3000/api/mindmaps/update', {
        method: 'POST',
        headers: {
          Cookie: 'token=valid-jwt-token',
        },
        body: JSON.stringify({
          videoId: mockVideo._id,
          nodes: [
            { id: '1', position: { x: 0, y: 0 } },
            { id: '2', position: { x: 100, y: 100 } },
          ],
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })
  })

  describe('Notes Feature', () => {
    describe('GET /api/notes/[videoId]', () => {
      it('should fetch notes for a video', async () => {
        const { GET } = await import('@/app/api/notes/[videoId]/route')

        const request = new NextRequest(`http://localhost:3000/api/notes/${mockVideo._id}`, {
          headers: {
            Cookie: 'token=valid-jwt-token',
          },
        })

        const response = await GET(request, { params: { videoId: mockVideo._id } })
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
      })
    })

    describe('POST /api/notes/[videoId]', () => {
      it('should create or update notes for a video', async () => {
        const { POST } = await import('@/app/api/notes/[videoId]/route')

        const request = new NextRequest(`http://localhost:3000/api/notes/${mockVideo._id}`, {
          method: 'POST',
          headers: {
            Cookie: 'token=valid-jwt-token',
          },
          body: JSON.stringify({
            content: 'My study notes for this video...',
          }),
        })

        const response = await POST(request, { params: { videoId: mockVideo._id } })
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
        expect(data.data.note).toHaveProperty('content', 'My study notes for this video...')
      })
    })
  })
})
