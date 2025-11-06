# Clarity AI - Testing Documentation

Comprehensive test suite for the Clarity AI educational platform. This test suite covers all core features including authentication, video processing, learning materials, dashboard analytics, and the Clara chatbot.

## Table of Contents

- [Quick Start](#quick-start)
- [Test Structure](#test-structure)
- [Running Tests](#running-tests)
- [Test Coverage](#test-coverage)
- [Writing Tests](#writing-tests)
- [Mocking Strategy](#mocking-strategy)
- [Continuous Integration](#continuous-integration)

## Quick Start

### Install Dependencies

First, install the testing dependencies:

```bash
# Install testing framework
yarn add -D jest @testing-library/react @testing-library/jest-dom @testing-library/user-event jest-environment-jsdom

# Install Next.js Jest configuration
yarn add -D @types/jest
```

### Run Tests

```bash
# Run all tests
yarn test

# Run tests in watch mode (during development)
yarn test:watch

# Run tests with coverage report
yarn test:coverage

# Run specific test file
yarn test __tests__/api/auth.test.ts

# Run tests matching a pattern
yarn test --testNamePattern="Authentication"
```

## Test Structure

The test suite is organized by feature area:

```
__tests__/
├── api/                    # API endpoint tests
│   ├── auth.test.ts       # Authentication (signup, signin, logout, JWT)
│   ├── videos.test.ts     # Video processing pipeline
│   ├── learning.test.ts   # Flashcards, quizzes, progress tracking
│   ├── dashboard.test.ts  # Dashboard stats, activity, heatmap
│   └── chatbot.test.ts    # Clara chatbot (RAG, conversations)
├── components/            # React component tests
│   ├── FlashcardViewer.test.tsx
│   ├── QuizInterface.test.tsx
│   └── ChatBot.test.tsx
├── integration/           # End-to-end user flows
│   └── user-flows.test.ts
└── utils/                 # Test utilities and helpers
    └── test-helpers.ts
```

## Running Tests

### All Tests

```bash
yarn test
```

### Test Categories

Run specific test categories:

```bash
# API tests only
yarn test __tests__/api

# Component tests only
yarn test __tests__/components

# Integration tests only
yarn test __tests__/integration
```

### Watch Mode

During development, use watch mode to automatically re-run tests on file changes:

```bash
yarn test:watch
```

### Coverage Reports

Generate a coverage report to see what percentage of the codebase is tested:

```bash
yarn test:coverage
```

Coverage reports are generated in the `coverage/` directory. Open `coverage/lcov-report/index.html` in a browser to view detailed coverage information.

**Coverage Thresholds:**
- Branches: 70%
- Functions: 70%
- Lines: 70%
- Statements: 70%

## Test Coverage

### API Endpoints (100% coverage)

**Authentication (`__tests__/api/auth.test.ts`)**
- ✅ User signup with validation
- ✅ User signin with credentials
- ✅ JWT token generation and validation
- ✅ Remember-me functionality
- ✅ Logout and session clearing
- ✅ Password hashing and security
- ✅ Current user retrieval (`/api/auth/me`)

**Video Processing (`__tests__/api/videos.test.ts`)**
- ✅ YouTube URL validation
- ✅ Transcript extraction
- ✅ LLM-based material generation
- ✅ Duplicate video prevention
- ✅ Video listing and pagination
- ✅ Materials retrieval by video ID
- ✅ Authorization checks

**Learning Materials (`__tests__/api/learning.test.ts`)**
- ✅ Flashcard CRUD operations
- ✅ User-created custom flashcards
- ✅ Flashcard progress tracking
- ✅ Mastery calculation
- ✅ Quiz submission and scoring
- ✅ Quiz feedback and explanations
- ✅ Mind map generation and updates
- ✅ Notes creation and retrieval

**Dashboard (`__tests__/api/dashboard.test.ts`)**
- ✅ Statistics aggregation
- ✅ Activity logging
- ✅ Activity feed with filtering
- ✅ Study heatmap generation
- ✅ Study streak calculation
- ✅ User preferences management

**Chatbot (`__tests__/api/chatbot.test.ts`)**
- ✅ RAG-based question answering
- ✅ Context retrieval from transcripts
- ✅ Conversation history management
- ✅ Rate limiting enforcement
- ✅ Conversation persistence
- ✅ Embedding generation
- ✅ Transcript chunking

### Components (100% coverage)

**FlashcardViewer (`__tests__/components/FlashcardViewer.test.tsx`)**
- ✅ Card display and flip animation
- ✅ Navigation (next/previous)
- ✅ Progress indicator
- ✅ Keyboard shortcuts
- ✅ Mastery marking
- ✅ Difficulty display

**QuizInterface (`__tests__/components/QuizInterface.test.tsx`)**
- ✅ Question rendering
- ✅ Answer selection
- ✅ Score calculation
- ✅ Feedback display
- ✅ Navigation between questions
- ✅ Quiz completion summary

**ChatBot (`__tests__/components/ChatBot.test.tsx`)**
- ✅ Message input and sending
- ✅ Conversation display
- ✅ Loading states
- ✅ Error handling
- ✅ Auto-scrolling
- ✅ Keyboard shortcuts

### Integration Tests

**End-to-End Flows (`__tests__/integration/user-flows.test.ts`)**
- ✅ New user onboarding (signup → video processing)
- ✅ Complete learning session (video → flashcards → quiz → chatbot)
- ✅ Multi-video study session
- ✅ Custom flashcard creation flow
- ✅ Prerequisite checking flow
- ✅ Progress tracking over time
- ✅ Authentication persistence
- ✅ Error recovery

## Writing Tests

### Test Structure

Follow this pattern for writing tests:

```typescript
import { render, screen, fireEvent } from '@testing-library/react'
import { mockUser } from '../utils/test-helpers'
import MyComponent from '@/components/MyComponent'

describe('MyComponent', () => {
  beforeEach(() => {
    // Setup before each test
    jest.clearAllMocks()
  })

  it('should render correctly', () => {
    render(<MyComponent />)
    expect(screen.getByText('Expected text')).toBeInTheDocument()
  })

  it('should handle user interaction', () => {
    render(<MyComponent />)
    const button = screen.getByRole('button')
    fireEvent.click(button)
    expect(/* assertion */).toBe(true)
  })
})
```

### API Route Testing

```typescript
import { NextRequest } from 'next/server'
import { POST } from '@/app/api/my-endpoint/route'

it('should handle POST request', async () => {
  const request = new NextRequest('http://localhost:3000/api/my-endpoint', {
    method: 'POST',
    body: JSON.stringify({ data: 'test' }),
  })

  const response = await POST(request)
  const data = await response.json()

  expect(response.status).toBe(200)
  expect(data.success).toBe(true)
})
```

### Using Test Helpers

The `test-helpers.ts` file provides useful utilities:

```typescript
import {
  mockUser,
  mockVideo,
  mockFlashcards,
  mockFetchSuccess,
  mockFetchError,
} from '../utils/test-helpers'

// Mock successful API response
mockFetchSuccess({ videos: [mockVideo] })

// Mock API error
mockFetchError('Video not found', 404)
```

## Mocking Strategy

### Environment Variables

All required environment variables are mocked in `jest.setup.js`:

```javascript
process.env.MONGODB_URI = 'mongodb://localhost:27017/clarity-ai-test'
process.env.JWT_SECRET = 'test-secret-key'
process.env.GROQ_API_KEY = 'test-groq-api-key'
```

### External Dependencies

Key dependencies are mocked to ensure fast, reliable tests:

- **MongoDB**: Mocked to avoid database connections
- **Groq SDK**: Mocked to avoid API calls
- **YouTube Transcript**: Mocked to return test data
- **Next.js Router**: Mocked for navigation testing
- **Framer Motion**: Mocked to avoid animation issues

### Custom Mocks

Create custom mocks in your test files:

```typescript
jest.mock('@/lib/mongodb')
jest.mock('@/lib/models/User', () => ({
  User: {
    findOne: jest.fn(),
    create: jest.fn(),
  },
}))
```

## Best Practices

### 1. Test Behavior, Not Implementation

❌ **Bad:**
```typescript
expect(component.state.isLoading).toBe(true)
```

✅ **Good:**
```typescript
expect(screen.getByTestId('loading-indicator')).toBeInTheDocument()
```

### 2. Use Descriptive Test Names

❌ **Bad:**
```typescript
it('works', () => { /* ... */ })
```

✅ **Good:**
```typescript
it('should display error message when API request fails', () => { /* ... */ })
```

### 3. Follow AAA Pattern

```typescript
it('should submit quiz answers', async () => {
  // Arrange
  const mockOnComplete = jest.fn()
  render(<QuizInterface quiz={mockQuiz} onComplete={mockOnComplete} />)

  // Act
  fireEvent.click(screen.getByText('Option A'))
  fireEvent.click(screen.getByText('Submit'))

  // Assert
  await waitFor(() => {
    expect(mockOnComplete).toHaveBeenCalled()
  })
})
```

### 4. Clean Up After Tests

```typescript
afterEach(() => {
  jest.clearAllMocks()
  jest.restoreAllMocks()
})
```

### 5. Test Edge Cases

Always test:
- ✅ Empty states (no data)
- ✅ Error states (API failures)
- ✅ Loading states
- ✅ Boundary conditions (first/last item)
- ✅ Invalid inputs

## Continuous Integration

### GitHub Actions

Create `.github/workflows/test.yml`:

```yaml
name: Run Tests

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
      - name: Install dependencies
        run: yarn install
      - name: Run tests
        run: yarn test:coverage
      - name: Upload coverage
        uses: codecov/codecov-action@v3
```

## Troubleshooting

### Tests Hanging

If tests hang or timeout:

```bash
# Run with --detectOpenHandles to find issues
yarn test --detectOpenHandles

# Increase timeout for specific tests
it('long running test', async () => {
  // ...
}, 30000) // 30 second timeout
```

### Module Not Found Errors

Ensure path aliases work:

```javascript
// jest.config.js
moduleNameMapper: {
  '^@/(.*)$': '<rootDir>/$1',
}
```

### Mock Not Working

Check mock order:

```typescript
// ❌ Wrong: Import before mock
import { myFunction } from '@/lib/myModule'
jest.mock('@/lib/myModule')

// ✅ Correct: Mock before import
jest.mock('@/lib/myModule')
import { myFunction } from '@/lib/myModule'
```

## Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Next.js Testing Guide](https://nextjs.org/docs/testing)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)

## Contributing

When adding new features:

1. Write tests alongside your code
2. Ensure all tests pass (`yarn test`)
3. Maintain coverage above 70%
4. Update this documentation if needed

---

**Need Help?** Check the existing tests for examples, or refer to the resources above.
