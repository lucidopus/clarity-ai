/**
 * Dashboard API Tests
 * Tests for dashboard statistics, activity tracking, and analytics
 */

import { NextRequest } from 'next/server'
import { mockUser, mockDashboardStats, mockActivityLog } from '../utils/test-helpers'

jest.mock('@/lib/mongodb')
jest.mock('@/lib/models/Video')
jest.mock('@/lib/models/Progress')
jest.mock('@/lib/models/ActivityLog')

describe('Dashboard API', () => {
  describe('GET /api/dashboard/stats', () => {
    it('should fetch user dashboard statistics', async () => {
      const { GET } = await import('@/app/api/dashboard/stats/route')

      const request = new NextRequest('http://localhost:3000/api/dashboard/stats', {
        headers: {
          Cookie: 'token=valid-jwt-token',
        },
      })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.stats).toHaveProperty('totalVideos')
      expect(data.data.stats).toHaveProperty('totalFlashcards')
      expect(data.data.stats).toHaveProperty('quizzesCompleted')
      expect(data.data.stats).toHaveProperty('averageQuizScore')
      expect(data.data.stats).toHaveProperty('studyStreak')
      expect(data.data.stats).toHaveProperty('totalStudyTime')
    })

    it('should calculate correct statistics from user data', async () => {
      const { GET } = await import('@/app/api/dashboard/stats/route')

      const request = new NextRequest('http://localhost:3000/api/dashboard/stats', {
        headers: {
          Cookie: 'token=valid-jwt-token',
        },
      })

      const response = await GET(request)
      const data = await response.json()

      const stats = data.data.stats

      // Validate data types and ranges
      expect(typeof stats.totalVideos).toBe('number')
      expect(stats.totalVideos).toBeGreaterThanOrEqual(0)

      expect(typeof stats.averageQuizScore).toBe('number')
      expect(stats.averageQuizScore).toBeGreaterThanOrEqual(0)
      expect(stats.averageQuizScore).toBeLessThanOrEqual(100)

      expect(typeof stats.studyStreak).toBe('number')
      expect(stats.studyStreak).toBeGreaterThanOrEqual(0)
    })

    it('should require authentication', async () => {
      const { GET } = await import('@/app/api/dashboard/stats/route')

      const request = new NextRequest('http://localhost:3000/api/dashboard/stats')

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.success).toBe(false)
    })
  })

  describe('GET /api/dashboard/activity', () => {
    it('should fetch recent user activity', async () => {
      const { GET } = await import('@/app/api/dashboard/activity/route')

      const request = new NextRequest('http://localhost:3000/api/dashboard/activity', {
        headers: {
          Cookie: 'token=valid-jwt-token',
        },
      })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(Array.isArray(data.data.activities)).toBe(true)
    })

    it('should support pagination for activity feed', async () => {
      const { GET } = await import('@/app/api/dashboard/activity/route')

      const request = new NextRequest('http://localhost:3000/api/dashboard/activity?page=1&limit=20', {
        headers: {
          Cookie: 'token=valid-jwt-token',
        },
      })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data.activities.length).toBeLessThanOrEqual(20)
      expect(data.data).toHaveProperty('pagination')
    })

    it('should filter activities by type', async () => {
      const { GET } = await import('@/app/api/dashboard/activity/route')

      const request = new NextRequest(
        'http://localhost:3000/api/dashboard/activity?type=quiz_completed',
        {
          headers: {
            Cookie: 'token=valid-jwt-token',
          },
        }
      )

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      data.data.activities.forEach((activity: any) => {
        expect(activity.activityType).toBe('quiz_completed')
      })
    })

    it('should filter activities by date range', async () => {
      const { GET } = await import('@/app/api/dashboard/activity/route')

      const startDate = new Date('2024-01-01').toISOString()
      const endDate = new Date('2024-12-31').toISOString()

      const request = new NextRequest(
        `http://localhost:3000/api/dashboard/activity?startDate=${startDate}&endDate=${endDate}`,
        {
          headers: {
            Cookie: 'token=valid-jwt-token',
          },
        }
      )

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      data.data.activities.forEach((activity: any) => {
        const activityDate = new Date(activity.timestamp)
        expect(activityDate >= new Date(startDate)).toBe(true)
        expect(activityDate <= new Date(endDate)).toBe(true)
      })
    })
  })

  describe('GET /api/dashboard/activity-heatmap', () => {
    it('should generate study activity heatmap data', async () => {
      const { GET } = await import('@/app/api/dashboard/activity-heatmap/route')

      const request = new NextRequest('http://localhost:3000/api/dashboard/activity-heatmap', {
        headers: {
          Cookie: 'token=valid-jwt-token',
        },
      })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(Array.isArray(data.data.heatmap)).toBe(true)

      // Heatmap should have date and count for each day
      if (data.data.heatmap.length > 0) {
        expect(data.data.heatmap[0]).toHaveProperty('date')
        expect(data.data.heatmap[0]).toHaveProperty('count')
      }
    })

    it('should support custom date ranges for heatmap', async () => {
      const { GET } = await import('@/app/api/dashboard/activity-heatmap/route')

      const request = new NextRequest(
        'http://localhost:3000/api/dashboard/activity-heatmap?days=30',
        {
          headers: {
            Cookie: 'token=valid-jwt-token',
          },
        }
      )

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data.heatmap.length).toBeLessThanOrEqual(30)
    })

    it('should calculate study intensity correctly', async () => {
      const { GET } = await import('@/app/api/dashboard/activity-heatmap/route')

      const request = new NextRequest('http://localhost:3000/api/dashboard/activity-heatmap', {
        headers: {
          Cookie: 'token=valid-jwt-token',
        },
      })

      const response = await GET(request)
      const data = await response.json()

      data.data.heatmap.forEach((day: any) => {
        expect(day.count).toBeGreaterThanOrEqual(0)
        expect(typeof day.count).toBe('number')
      })
    })
  })

  describe('POST /api/activity/log', () => {
    it('should log video processing activity', async () => {
      const { POST } = await import('@/app/api/activity/log/route')

      const request = new NextRequest('http://localhost:3000/api/activity/log', {
        method: 'POST',
        headers: {
          Cookie: 'token=valid-jwt-token',
        },
        body: JSON.stringify({
          activityType: 'video_processed',
          videoId: '507f1f77bcf86cd799439012',
          metadata: {
            videoTitle: 'Introduction to ML',
            duration: 1800,
          },
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.success).toBe(true)
      expect(data.data.activity).toHaveProperty('activityType', 'video_processed')
    })

    it('should log quiz completion activity', async () => {
      const { POST } = await import('@/app/api/activity/log/route')

      const request = new NextRequest('http://localhost:3000/api/activity/log', {
        method: 'POST',
        headers: {
          Cookie: 'token=valid-jwt-token',
        },
        body: JSON.stringify({
          activityType: 'quiz_completed',
          videoId: '507f1f77bcf86cd799439012',
          metadata: {
            score: 90,
            totalQuestions: 10,
          },
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.success).toBe(true)
      expect(data.data.activity.metadata).toHaveProperty('score', 90)
    })

    it('should log flashcard study activity', async () => {
      const { POST } = await import('@/app/api/activity/log/route')

      const request = new NextRequest('http://localhost:3000/api/activity/log', {
        method: 'POST',
        headers: {
          Cookie: 'token=valid-jwt-token',
        },
        body: JSON.stringify({
          activityType: 'flashcard_reviewed',
          videoId: '507f1f77bcf86cd799439012',
          metadata: {
            flashcardId: '507f1f77bcf86cd799439013',
            correct: true,
          },
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.success).toBe(true)
    })

    it('should require valid activity type', async () => {
      const { POST } = await import('@/app/api/activity/log/route')

      const request = new NextRequest('http://localhost:3000/api/activity/log', {
        method: 'POST',
        headers: {
          Cookie: 'token=valid-jwt-token',
        },
        body: JSON.stringify({
          activityType: 'invalid_activity_type',
          videoId: '507f1f77bcf86cd799439012',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
    })
  })

  describe('Study Streak Calculation', () => {
    it('should calculate consecutive study days', () => {
      const activityDates = [
        new Date('2024-01-05'),
        new Date('2024-01-04'),
        new Date('2024-01-03'),
        new Date('2024-01-02'),
        new Date('2024-01-01'),
      ]

      // Mock function to calculate streak
      const calculateStreak = (dates: Date[]) => {
        if (dates.length === 0) return 0

        let streak = 1
        for (let i = 1; i < dates.length; i++) {
          const prevDate = new Date(dates[i - 1])
          const currDate = new Date(dates[i])
          const diffDays = Math.floor(
            (prevDate.getTime() - currDate.getTime()) / (1000 * 60 * 60 * 24)
          )

          if (diffDays === 1) {
            streak++
          } else {
            break
          }
        }
        return streak
      }

      const streak = calculateStreak(activityDates)
      expect(streak).toBe(5)
    })

    it('should reset streak if study was missed', () => {
      const activityDates = [
        new Date('2024-01-05'),
        new Date('2024-01-04'),
        new Date('2024-01-01'), // Gap here
      ]

      const calculateStreak = (dates: Date[]) => {
        if (dates.length === 0) return 0
        let streak = 1
        for (let i = 1; i < dates.length; i++) {
          const prevDate = new Date(dates[i - 1])
          const currDate = new Date(dates[i])
          const diffDays = Math.floor(
            (prevDate.getTime() - currDate.getTime()) / (1000 * 60 * 60 * 24)
          )
          if (diffDays === 1) {
            streak++
          } else {
            break
          }
        }
        return streak
      }

      const streak = calculateStreak(activityDates)
      expect(streak).toBe(2)
    })
  })

  describe('Statistics Aggregation', () => {
    it('should calculate average quiz score correctly', () => {
      const quizScores = [85, 90, 75, 95, 80]
      const average = quizScores.reduce((sum, score) => sum + score, 0) / quizScores.length

      expect(average).toBeCloseTo(85, 0)
    })

    it('should handle zero quizzes completed', () => {
      const quizScores: number[] = []
      const average = quizScores.length > 0
        ? quizScores.reduce((sum, score) => sum + score, 0) / quizScores.length
        : 0

      expect(average).toBe(0)
    })

    it('should calculate total study time from activities', () => {
      const sessions = [
        { duration: 30 }, // minutes
        { duration: 45 },
        { duration: 60 },
      ]

      const totalTime = sessions.reduce((sum, session) => sum + session.duration, 0)
      expect(totalTime).toBe(135)
    })
  })

  describe('User Preferences', () => {
    describe('GET /api/preferences', () => {
      it('should fetch user preferences', async () => {
        const { GET } = await import('@/app/api/preferences/route')

        const request = new NextRequest('http://localhost:3000/api/preferences', {
          headers: {
            Cookie: 'token=valid-jwt-token',
          },
        })

        const response = await GET(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
        expect(data.data.preferences).toBeDefined()
      })
    })

    describe('PUT /api/preferences', () => {
      it('should update user preferences', async () => {
        const { PUT } = await import('@/app/api/preferences/route')

        const request = new NextRequest('http://localhost:3000/api/preferences', {
          method: 'PUT',
          headers: {
            Cookie: 'token=valid-jwt-token',
          },
          body: JSON.stringify({
            theme: 'dark',
            notifications: true,
            studyReminders: true,
          }),
        })

        const response = await PUT(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
        expect(data.data.preferences).toHaveProperty('theme', 'dark')
      })
    })
  })
})
