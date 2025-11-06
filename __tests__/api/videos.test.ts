/**
 * Video Processing API Tests
 * Tests for video processing pipeline, transcript extraction, and LLM generation
 */

import { NextRequest } from 'next/server'
import { mockUser, mockVideo, mockYouTubeTranscript, mockGroqResponse } from '../utils/test-helpers'

jest.mock('@/lib/mongodb')
jest.mock('@/lib/models/Video')
jest.mock('@/lib/models/LearningMaterial')
jest.mock('@/lib/transcript')
jest.mock('@/lib/sdk')

describe('Video Processing API', () => {
  describe('POST /api/videos/process', () => {
    it('should process YouTube video and generate learning materials', async () => {
      const { POST } = await import('@/app/api/videos/process/route')

      const request = new NextRequest('http://localhost:3000/api/videos/process', {
        method: 'POST',
        headers: {
          Cookie: 'token=valid-jwt-token',
        },
        body: JSON.stringify({
          youtubeUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.video).toHaveProperty('videoId', 'dQw4w9WgXcQ')
      expect(data.data.video).toHaveProperty('status', 'completed')
      expect(data.data.materials).toBeDefined()
    }, 30000) // 30 second timeout for LLM processing

    it('should reject invalid YouTube URLs', async () => {
      const { POST } = await import('@/app/api/videos/process/route')

      const request = new NextRequest('http://localhost:3000/api/videos/process', {
        method: 'POST',
        headers: {
          Cookie: 'token=valid-jwt-token',
        },
        body: JSON.stringify({
          youtubeUrl: 'https://invalid-url.com/video',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toContain('Invalid YouTube URL')
    })

    it('should handle videos without available transcripts', async () => {
      const { POST } = await import('@/app/api/videos/process/route')

      const request = new NextRequest('http://localhost:3000/api/videos/process', {
        method: 'POST',
        headers: {
          Cookie: 'token=valid-jwt-token',
        },
        body: JSON.stringify({
          youtubeUrl: 'https://www.youtube.com/watch?v=NO_TRANSCRIPT',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toContain('transcript')
    })

    it('should prevent duplicate video processing', async () => {
      const { POST } = await import('@/app/api/videos/process/route')

      const request = new NextRequest('http://localhost:3000/api/videos/process', {
        method: 'POST',
        headers: {
          Cookie: 'token=valid-jwt-token',
        },
        body: JSON.stringify({
          youtubeUrl: mockVideo.youtubeUrl,
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data.video).toHaveProperty('videoId', mockVideo.videoId)
      // Should return existing video, not create duplicate
    })

    it('should require authentication', async () => {
      const { POST } = await import('@/app/api/videos/process/route')

      const request = new NextRequest('http://localhost:3000/api/videos/process', {
        method: 'POST',
        body: JSON.stringify({
          youtubeUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.success).toBe(false)
    })
  })

  describe('GET /api/videos', () => {
    it('should fetch all videos for authenticated user', async () => {
      const { GET } = await import('@/app/api/videos/route')

      const request = new NextRequest('http://localhost:3000/api/videos', {
        headers: {
          Cookie: 'token=valid-jwt-token',
        },
      })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(Array.isArray(data.data.videos)).toBe(true)
    })

    it('should support pagination', async () => {
      const { GET } = await import('@/app/api/videos/route')

      const request = new NextRequest('http://localhost:3000/api/videos?page=1&limit=10', {
        headers: {
          Cookie: 'token=valid-jwt-token',
        },
      })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data.videos.length).toBeLessThanOrEqual(10)
      expect(data.data).toHaveProperty('pagination')
    })

    it('should support filtering by status', async () => {
      const { GET } = await import('@/app/api/videos/route')

      const request = new NextRequest('http://localhost:3000/api/videos?status=completed', {
        headers: {
          Cookie: 'token=valid-jwt-token',
        },
      })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      data.data.videos.forEach((video: any) => {
        expect(video.status).toBe('completed')
      })
    })
  })

  describe('GET /api/videos/[videoId]/materials', () => {
    it('should fetch learning materials for a specific video', async () => {
      const { GET } = await import('@/app/api/videos/[videoId]/materials/route')

      const request = new NextRequest(`http://localhost:3000/api/videos/${mockVideo._id}/materials`, {
        headers: {
          Cookie: 'token=valid-jwt-token',
        },
      })

      const response = await GET(request, { params: { videoId: mockVideo._id } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.materials).toHaveProperty('flashcards')
      expect(data.data.materials).toHaveProperty('quiz')
      expect(data.data.materials).toHaveProperty('timestamps')
      expect(data.data.materials).toHaveProperty('prerequisites')
    })

    it('should return 404 for non-existent video', async () => {
      const { GET } = await import('@/app/api/videos/[videoId]/materials/route')

      const request = new NextRequest('http://localhost:3000/api/videos/invalid-id/materials', {
        headers: {
          Cookie: 'token=valid-jwt-token',
        },
      })

      const response = await GET(request, { params: { videoId: 'invalid-id' } })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.success).toBe(false)
    })

    it('should prevent unauthorized access to other users\' videos', async () => {
      const { GET } = await import('@/app/api/videos/[videoId]/materials/route')

      const request = new NextRequest(`http://localhost:3000/api/videos/${mockVideo._id}/materials`, {
        headers: {
          Cookie: 'token=different-user-jwt-token',
        },
      })

      const response = await GET(request, { params: { videoId: mockVideo._id } })
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.success).toBe(false)
    })
  })

  describe('Transcript Extraction', () => {
    it('should extract transcript from YouTube video', async () => {
      const { fetchTranscript } = await import('@/lib/transcript')

      const transcript = await fetchTranscript('https://www.youtube.com/watch?v=dQw4w9WgXcQ')

      expect(Array.isArray(transcript)).toBe(true)
      expect(transcript.length).toBeGreaterThan(0)
      expect(transcript[0]).toHaveProperty('text')
      expect(transcript[0]).toHaveProperty('offset')
      expect(transcript[0]).toHaveProperty('duration')
    })

    it('should handle different YouTube URL formats', async () => {
      const { fetchTranscript } = await import('@/lib/transcript')

      const formats = [
        'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        'https://youtu.be/dQw4w9WgXcQ',
        'https://www.youtube.com/embed/dQw4w9WgXcQ',
      ]

      for (const url of formats) {
        const transcript = await fetchTranscript(url)
        expect(Array.isArray(transcript)).toBe(true)
      }
    })

    it('should throw error for videos without transcripts', async () => {
      const { fetchTranscript } = await import('@/lib/transcript')

      await expect(
        fetchTranscript('https://www.youtube.com/watch?v=NO_TRANSCRIPT')
      ).rejects.toThrow()
    })
  })

  describe('LLM Integration', () => {
    it('should generate flashcards from transcript', async () => {
      const { generateFlashcards } = await import('@/lib/llm')

      const flashcards = await generateFlashcards(mockYouTubeTranscript.join(' '))

      expect(Array.isArray(flashcards)).toBe(true)
      expect(flashcards.length).toBeGreaterThan(0)
      expect(flashcards[0]).toHaveProperty('front')
      expect(flashcards[0]).toHaveProperty('back')
      expect(flashcards[0]).toHaveProperty('difficulty')
    })

    it('should generate quiz questions from transcript', async () => {
      const { generateQuiz } = await import('@/lib/llm')

      const quiz = await generateQuiz(mockYouTubeTranscript.join(' '))

      expect(Array.isArray(quiz.questions)).toBe(true)
      expect(quiz.questions.length).toBeGreaterThan(0)
      expect(quiz.questions[0]).toHaveProperty('question')
      expect(quiz.questions[0]).toHaveProperty('options')
      expect(quiz.questions[0]).toHaveProperty('correctAnswer')
      expect(quiz.questions[0]).toHaveProperty('explanation')
    })

    it('should generate timestamps from transcript', async () => {
      const { generateTimestamps } = await import('@/lib/llm')

      const timestamps = await generateTimestamps(mockYouTubeTranscript)

      expect(Array.isArray(timestamps)).toBe(true)
      expect(timestamps[0]).toHaveProperty('time')
      expect(timestamps[0]).toHaveProperty('label')
      expect(timestamps[0]).toHaveProperty('description')
    })

    it('should identify prerequisites from transcript', async () => {
      const { generatePrerequisites } = await import('@/lib/llm')

      const prerequisites = await generatePrerequisites(mockYouTubeTranscript.join(' '))

      expect(prerequisites).toHaveProperty('required')
      expect(prerequisites).toHaveProperty('recommended')
      expect(Array.isArray(prerequisites.required)).toBe(true)
      expect(Array.isArray(prerequisites.recommended)).toBe(true)
    })

    it('should handle LLM API errors gracefully', async () => {
      const { generateFlashcards } = await import('@/lib/llm')

      // Mock API failure
      jest.spyOn(global, 'fetch').mockRejectedValueOnce(new Error('API Error'))

      await expect(
        generateFlashcards('test transcript')
      ).rejects.toThrow()
    })
  })
})
