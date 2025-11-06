import '@testing-library/jest-dom'
import 'whatwg-fetch'

// Polyfill for Next.js 16 Web APIs
import { TextEncoder, TextDecoder } from 'util'
global.TextEncoder = TextEncoder
global.TextDecoder = TextDecoder

// Simple Request/Response polyfills for Next.js testing
if (typeof global.Request === 'undefined') {
  global.Request = class Request {
    constructor(input, init = {}) {
      this.url = typeof input === 'string' ? input : input.url
      this.method = init.method || 'GET'
      this.headers = new Map(Object.entries(init.headers || {}))
      this._body = init.body
    }
    async json() {
      return JSON.parse(this._body)
    }
    async text() {
      return this._body
    }
  }
}

if (typeof global.Response === 'undefined') {
  global.Response = class Response {
    constructor(body, init = {}) {
      this.body = body
      this.status = init.status || 200
      this.ok = this.status >= 200 && this.status < 300
      this.headers = new Map(Object.entries(init.headers || {}))
    }
    async json() {
      return typeof this.body === 'string' ? JSON.parse(this.body) : this.body
    }
    async text() {
      return typeof this.body === 'string' ? this.body : JSON.stringify(this.body)
    }
  }
}

if (typeof global.Headers === 'undefined') {
  global.Headers = Map
}

// Mock environment variables for testing
process.env.MONGODB_URI = 'mongodb://localhost:27017/clarity-ai-test'
process.env.JWT_SECRET = 'test-secret-key-for-jwt-tokens-minimum-32-characters'
process.env.JWT_EXPIRE_DAYS = '1'
process.env.JWT_REMEMBER_DAYS = '30'
process.env.GROQ_API_KEY = 'test-groq-api-key'
process.env.GROQ_MODEL = 'gpt-4o-120b'

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: jest.fn(),
      replace: jest.fn(),
      prefetch: jest.fn(),
      back: jest.fn(),
      pathname: '/',
      query: {},
      asPath: '/',
    }
  },
  usePathname() {
    return '/'
  },
  useSearchParams() {
    return new URLSearchParams()
  },
}))

// Mock framer-motion to avoid animation issues in tests
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }) => <div {...props}>{children}</div>,
    button: ({ children, ...props }) => <button {...props}>{children}</button>,
    span: ({ children, ...props }) => <span {...props}>{children}</span>,
    p: ({ children, ...props }) => <p {...props}>{children}</p>,
  },
  AnimatePresence: ({ children }) => <>{children}</>,
}))

// Global test utilities
global.mockFetch = (responseData, status = 200) => {
  global.fetch = jest.fn(() =>
    Promise.resolve({
      ok: status >= 200 && status < 300,
      status,
      json: async () => responseData,
      text: async () => JSON.stringify(responseData),
    })
  )
}
