import '@testing-library/jest-dom'

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
