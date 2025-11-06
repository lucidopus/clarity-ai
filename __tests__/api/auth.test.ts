/**
 * Authentication API Tests
 * Tests for signup, signin, logout, and authentication middleware
 */

import { NextRequest } from 'next/server'
import { mockUser, mockJWT } from '../utils/test-helpers'

// Mock dependencies
jest.mock('@/lib/mongodb')
jest.mock('@/lib/models/User')
jest.mock('bcryptjs')
jest.mock('jsonwebtoken')

describe('Authentication API', () => {
  describe('POST /api/auth/signup', () => {
    it('should create a new user account successfully', async () => {
      const { POST } = await import('@/app/api/auth/signup/route')

      const request = new NextRequest('http://localhost:3000/api/auth/signup', {
        method: 'POST',
        body: JSON.stringify({
          email: 'newuser@example.com',
          password: 'SecurePass123!',
          firstName: 'New',
          lastName: 'User',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.success).toBe(true)
      expect(data.data.user).toHaveProperty('email', 'newuser@example.com')
      expect(data.data.user).toHaveProperty('firstName', 'New')
      expect(data.data.user).not.toHaveProperty('password')
    })

    it('should reject signup with existing email', async () => {
      const { POST } = await import('@/app/api/auth/signup/route')

      const request = new NextRequest('http://localhost:3000/api/auth/signup', {
        method: 'POST',
        body: JSON.stringify({
          email: mockUser.email,
          password: 'Password123!',
          firstName: 'Duplicate',
          lastName: 'User',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toContain('already exists')
    })

    it('should reject signup with weak password', async () => {
      const { POST } = await import('@/app/api/auth/signup/route')

      const request = new NextRequest('http://localhost:3000/api/auth/signup', {
        method: 'POST',
        body: JSON.stringify({
          email: 'test@example.com',
          password: '123', // Too weak
          firstName: 'Test',
          lastName: 'User',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toContain('password')
    })

    it('should reject signup with invalid email format', async () => {
      const { POST } = await import('@/app/api/auth/signup/route')

      const request = new NextRequest('http://localhost:3000/api/auth/signup', {
        method: 'POST',
        body: JSON.stringify({
          email: 'invalid-email',
          password: 'SecurePass123!',
          firstName: 'Test',
          lastName: 'User',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
    })

    it('should reject signup with missing required fields', async () => {
      const { POST } = await import('@/app/api/auth/signup/route')

      const request = new NextRequest('http://localhost:3000/api/auth/signup', {
        method: 'POST',
        body: JSON.stringify({
          email: 'test@example.com',
          // Missing password, firstName, lastName
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
    })
  })

  describe('POST /api/auth/signin', () => {
    it('should sign in user with correct credentials', async () => {
      const { POST } = await import('@/app/api/auth/signin/route')

      const request = new NextRequest('http://localhost:3000/api/auth/signin', {
        method: 'POST',
        body: JSON.stringify({
          email: mockUser.email,
          password: 'CorrectPassword123!',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.user).toHaveProperty('email', mockUser.email)
      expect(response.headers.get('Set-Cookie')).toContain('token=')
    })

    it('should reject signin with incorrect password', async () => {
      const { POST } = await import('@/app/api/auth/signin/route')

      const request = new NextRequest('http://localhost:3000/api/auth/signin', {
        method: 'POST',
        body: JSON.stringify({
          email: mockUser.email,
          password: 'WrongPassword123!',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.success).toBe(false)
      expect(data.error).toContain('Invalid credentials')
    })

    it('should reject signin with non-existent email', async () => {
      const { POST } = await import('@/app/api/auth/signin/route')

      const request = new NextRequest('http://localhost:3000/api/auth/signin', {
        method: 'POST',
        body: JSON.stringify({
          email: 'nonexistent@example.com',
          password: 'Password123!',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.success).toBe(false)
    })

    it('should set remember-me cookie when requested', async () => {
      const { POST } = await import('@/app/api/auth/signin/route')

      const request = new NextRequest('http://localhost:3000/api/auth/signin', {
        method: 'POST',
        body: JSON.stringify({
          email: mockUser.email,
          password: 'CorrectPassword123!',
          rememberMe: true,
        }),
      })

      const response = await POST(request)
      const setCookie = response.headers.get('Set-Cookie')

      expect(setCookie).toContain('token=')
      expect(setCookie).toContain('Max-Age=2592000') // 30 days
    })

    it('should set short-lived cookie when remember-me not checked', async () => {
      const { POST } = await import('@/app/api/auth/signin/route')

      const request = new NextRequest('http://localhost:3000/api/auth/signin', {
        method: 'POST',
        body: JSON.stringify({
          email: mockUser.email,
          password: 'CorrectPassword123!',
          rememberMe: false,
        }),
      })

      const response = await POST(request)
      const setCookie = response.headers.get('Set-Cookie')

      expect(setCookie).toContain('token=')
      expect(setCookie).toContain('Max-Age=86400') // 1 day
    })
  })

  describe('POST /api/auth/logout', () => {
    it('should clear authentication cookie on logout', async () => {
      const { POST } = await import('@/app/api/auth/logout/route')

      const request = new NextRequest('http://localhost:3000/api/auth/logout', {
        method: 'POST',
        headers: {
          Cookie: `token=${mockJWT}`,
        },
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(response.headers.get('Set-Cookie')).toContain('Max-Age=0')
    })
  })

  describe('GET /api/auth/me', () => {
    it('should return current user data when authenticated', async () => {
      const { GET } = await import('@/app/api/auth/me/route')

      const request = new NextRequest('http://localhost:3000/api/auth/me', {
        headers: {
          Cookie: `token=${mockJWT}`,
        },
      })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.user).toHaveProperty('email')
      expect(data.data.user).not.toHaveProperty('password')
    })

    it('should return 401 when not authenticated', async () => {
      const { GET } = await import('@/app/api/auth/me/route')

      const request = new NextRequest('http://localhost:3000/api/auth/me')

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.success).toBe(false)
    })

    it('should return 401 with invalid token', async () => {
      const { GET } = await import('@/app/api/auth/me/route')

      const request = new NextRequest('http://localhost:3000/api/auth/me', {
        headers: {
          Cookie: 'token=invalid-token-here',
        },
      })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.success).toBe(false)
    })
  })

  describe('JWT Token Management', () => {
    it('should generate valid JWT token with user data', () => {
      const jwt = require('jsonwebtoken')
      const token = jwt.sign(
        { userId: mockUser._id, email: mockUser.email },
        process.env.JWT_SECRET,
        { expiresIn: '1d' }
      )

      expect(token).toBeTruthy()
      const decoded = jwt.verify(token, process.env.JWT_SECRET)
      expect(decoded).toHaveProperty('userId', mockUser._id)
      expect(decoded).toHaveProperty('email', mockUser.email)
    })

    it('should reject expired JWT tokens', () => {
      const jwt = require('jsonwebtoken')
      const expiredToken = jwt.sign(
        { userId: mockUser._id, email: mockUser.email },
        process.env.JWT_SECRET,
        { expiresIn: '-1s' } // Already expired
      )

      expect(() => {
        jwt.verify(expiredToken, process.env.JWT_SECRET)
      }).toThrow()
    })

    it('should reject JWT tokens with wrong secret', () => {
      const jwt = require('jsonwebtoken')
      const token = jwt.sign(
        { userId: mockUser._id, email: mockUser.email },
        'wrong-secret',
        { expiresIn: '1d' }
      )

      expect(() => {
        jwt.verify(token, process.env.JWT_SECRET)
      }).toThrow()
    })
  })

  describe('Password Security', () => {
    it('should hash passwords before storing', async () => {
      const bcrypt = require('bcryptjs')
      const password = 'SecurePassword123!'
      const hash = await bcrypt.hash(password, 10)

      expect(hash).not.toBe(password)
      expect(hash.length).toBeGreaterThan(50)
    })

    it('should correctly compare password with hash', async () => {
      const bcrypt = require('bcryptjs')
      const password = 'SecurePassword123!'
      const hash = await bcrypt.hash(password, 10)

      const isMatch = await bcrypt.compare(password, hash)
      expect(isMatch).toBe(true)

      const isWrongMatch = await bcrypt.compare('WrongPassword', hash)
      expect(isWrongMatch).toBe(false)
    })
  })
})
