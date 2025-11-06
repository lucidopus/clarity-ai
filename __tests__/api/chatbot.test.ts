/**
 * Clara Chatbot API Tests
 * Tests for RAG-based Q&A, context retrieval, and conversation management
 */

import { NextRequest } from 'next/server'
import { mockUser, mockVideo, mockChatConversation } from '../utils/test-helpers'

jest.mock('@/lib/mongodb')
jest.mock('@/lib/chat-db')
jest.mock('@/lib/chatbot-context')
jest.mock('@/lib/sdk')

describe('Clara Chatbot API', () => {
  describe('POST /api/chatbot/ask', () => {
    it('should answer questions based on video context (RAG)', async () => {
      const { POST } = await import('@/app/api/chatbot/ask/route')

      const request = new NextRequest('http://localhost:3000/api/chatbot/ask', {
        method: 'POST',
        headers: {
          Cookie: 'token=valid-jwt-token',
        },
        body: JSON.stringify({
          videoId: mockVideo._id,
          question: 'Can you explain supervised learning?',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.answer).toBeTruthy()
      expect(typeof data.data.answer).toBe('string')
      expect(data.data.answer.length).toBeGreaterThan(0)
    }, 10000) // 10 second timeout for LLM response

    it('should include relevant context from transcript', async () => {
      const { POST } = await import('@/app/api/chatbot/ask/route')

      const request = new NextRequest('http://localhost:3000/api/chatbot/ask', {
        method: 'POST',
        headers: {
          Cookie: 'token=valid-jwt-token',
        },
        body: JSON.stringify({
          videoId: mockVideo._id,
          question: 'What was mentioned about neural networks?',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data).toHaveProperty('context')
      expect(Array.isArray(data.data.context)).toBe(true)
    })

    it('should maintain conversation history', async () => {
      const { POST } = await import('@/app/api/chatbot/ask/route')

      const request = new NextRequest('http://localhost:3000/api/chatbot/ask', {
        method: 'POST',
        headers: {
          Cookie: 'token=valid-jwt-token',
        },
        body: JSON.stringify({
          videoId: mockVideo._id,
          question: 'What did you just explain?',
          conversationId: mockChatConversation._id,
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data.conversationId).toBe(mockChatConversation._id)
    })

    it('should handle questions outside video context appropriately', async () => {
      const { POST } = await import('@/app/api/chatbot/ask/route')

      const request = new NextRequest('http://localhost:3000/api/chatbot/ask', {
        method: 'POST',
        headers: {
          Cookie: 'token=valid-jwt-token',
        },
        body: JSON.stringify({
          videoId: mockVideo._id,
          question: 'What is the weather today?',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data.answer).toContain('video') // Should redirect to video content
    })

    it('should reject empty questions', async () => {
      const { POST } = await import('@/app/api/chatbot/ask/route')

      const request = new NextRequest('http://localhost:3000/api/chatbot/ask', {
        method: 'POST',
        headers: {
          Cookie: 'token=valid-jwt-token',
        },
        body: JSON.stringify({
          videoId: mockVideo._id,
          question: '',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
    })

    it('should enforce rate limiting', async () => {
      const { POST } = await import('@/app/api/chatbot/ask/route')

      // Make multiple rapid requests
      const requests = Array.from({ length: 20 }, () =>
        POST(
          new NextRequest('http://localhost:3000/api/chatbot/ask', {
            method: 'POST',
            headers: {
              Cookie: 'token=valid-jwt-token',
            },
            body: JSON.stringify({
              videoId: mockVideo._id,
              question: 'Test question',
            }),
          })
        )
      )

      const responses = await Promise.all(requests)
      const rateLimited = responses.some((res) => res.status === 429)

      expect(rateLimited).toBe(true)
    }, 15000)

    it('should require authentication', async () => {
      const { POST } = await import('@/app/api/chatbot/ask/route')

      const request = new NextRequest('http://localhost:3000/api/chatbot/ask', {
        method: 'POST',
        body: JSON.stringify({
          videoId: mockVideo._id,
          question: 'Test question',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.success).toBe(false)
    })
  })

  describe('GET /api/chatbot/history', () => {
    it('should fetch conversation history for a video', async () => {
      const { GET } = await import('@/app/api/chatbot/history/route')

      const request = new NextRequest(
        `http://localhost:3000/api/chatbot/history?videoId=${mockVideo._id}`,
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
      expect(Array.isArray(data.data.conversations)).toBe(true)
    })

    it('should return conversation messages in chronological order', async () => {
      const { GET } = await import('@/app/api/chatbot/history/route')

      const request = new NextRequest(
        `http://localhost:3000/api/chatbot/history?videoId=${mockVideo._id}`,
        {
          headers: {
            Cookie: 'token=valid-jwt-token',
          },
        }
      )

      const response = await GET(request)
      const data = await response.json()

      if (data.data.conversations.length > 0) {
        const conversation = data.data.conversations[0]
        expect(Array.isArray(conversation.messages)).toBe(true)

        // Verify chronological order
        for (let i = 1; i < conversation.messages.length; i++) {
          const prevTime = new Date(conversation.messages[i - 1].timestamp)
          const currTime = new Date(conversation.messages[i].timestamp)
          expect(currTime >= prevTime).toBe(true)
        }
      }
    })

    it('should support pagination for conversation history', async () => {
      const { GET } = await import('@/app/api/chatbot/history/route')

      const request = new NextRequest(
        `http://localhost:3000/api/chatbot/history?videoId=${mockVideo._id}&page=1&limit=10`,
        {
          headers: {
            Cookie: 'token=valid-jwt-token',
          },
        }
      )

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data.conversations.length).toBeLessThanOrEqual(10)
    })
  })

  describe('DELETE /api/chatbot/history', () => {
    it('should delete a conversation', async () => {
      const { DELETE } = await import('@/app/api/chatbot/history/route')

      const request = new NextRequest(
        `http://localhost:3000/api/chatbot/history?conversationId=${mockChatConversation._id}`,
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

    it('should prevent deleting other users\' conversations', async () => {
      const { DELETE } = await import('@/app/api/chatbot/history/route')

      const request = new NextRequest(
        `http://localhost:3000/api/chatbot/history?conversationId=${mockChatConversation._id}`,
        {
          method: 'DELETE',
          headers: {
            Cookie: 'token=different-user-jwt-token',
          },
        }
      )

      const response = await DELETE(request)
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.success).toBe(false)
    })
  })

  describe('RAG Context Retrieval', () => {
    it('should retrieve relevant transcript chunks for question', async () => {
      const { retrieveContext } = await import('@/lib/chatbot-context')

      const context = await retrieveContext(
        mockVideo._id,
        'What is supervised learning?'
      )

      expect(Array.isArray(context)).toBe(true)
      expect(context.length).toBeGreaterThan(0)
      expect(context[0]).toHaveProperty('text')
      expect(context[0]).toHaveProperty('relevanceScore')
    })

    it('should rank context by relevance', async () => {
      const { retrieveContext } = await import('@/lib/chatbot-context')

      const context = await retrieveContext(
        mockVideo._id,
        'neural networks'
      )

      // Context should be sorted by relevance score (descending)
      for (let i = 1; i < context.length; i++) {
        expect(context[i - 1].relevanceScore).toBeGreaterThanOrEqual(
          context[i].relevanceScore
        )
      }
    })

    it('should limit number of context chunks returned', async () => {
      const { retrieveContext } = await import('@/lib/chatbot-context')

      const context = await retrieveContext(
        mockVideo._id,
        'machine learning',
        3 // maxChunks
      )

      expect(context.length).toBeLessThanOrEqual(3)
    })
  })

  describe('Chatbot Context Generation', () => {
    it('should generate embeddings for transcript chunks', async () => {
      const { generateEmbeddings } = await import('@/lib/chatbot-context')

      const chunks = [
        'Machine learning is a subset of artificial intelligence.',
        'It involves training models on data to make predictions.',
      ]

      const embeddings = await generateEmbeddings(chunks)

      expect(Array.isArray(embeddings)).toBe(true)
      expect(embeddings.length).toBe(chunks.length)
      expect(Array.isArray(embeddings[0])).toBe(true)
      expect(embeddings[0].length).toBeGreaterThan(0)
    })

    it('should chunk transcript into appropriate sizes', () => {
      const { chunkTranscript } = require('@/lib/chatbot-context')

      const longTranscript = 'word '.repeat(1000) // 1000 words
      const chunks = chunkTranscript(longTranscript, 200) // 200 words per chunk

      expect(Array.isArray(chunks)).toBe(true)
      chunks.forEach((chunk: string) => {
        const wordCount = chunk.split(' ').length
        expect(wordCount).toBeLessThanOrEqual(220) // Allow some buffer
      })
    })
  })

  describe('Conversation Management', () => {
    it('should create new conversation when none exists', async () => {
      const { createConversation } = await import('@/lib/chat-db')

      const conversation = await createConversation({
        userId: mockUser._id,
        videoId: mockVideo._id,
        initialQuestion: 'What is this video about?',
      })

      expect(conversation).toHaveProperty('_id')
      expect(conversation).toHaveProperty('userId', mockUser._id)
      expect(conversation).toHaveProperty('videoId', mockVideo._id)
      expect(conversation.messages.length).toBeGreaterThan(0)
    })

    it('should append messages to existing conversation', async () => {
      const { addMessage } = await import('@/lib/chat-db')

      const updatedConversation = await addMessage(
        mockChatConversation._id,
        {
          role: 'user',
          content: 'Follow-up question',
        }
      )

      expect(updatedConversation.messages.length).toBeGreaterThan(
        mockChatConversation.messages.length
      )
    })

    it('should limit conversation history to prevent token overflow', async () => {
      const { getConversationContext } = await import('@/lib/chat-db')

      const context = await getConversationContext(
        mockChatConversation._id,
        10 // maxMessages
      )

      expect(context.length).toBeLessThanOrEqual(10)
    })
  })
})
