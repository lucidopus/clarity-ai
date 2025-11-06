# Testing Setup Guide for Clarity AI

This guide will walk you through setting up and running the complete test suite for Clarity AI.

## Prerequisites

- Node.js 20+ installed
- Yarn package manager
- Clarity AI project cloned and dependencies installed

## Installation Steps

### 1. Install Testing Dependencies

Run the following command to install all required testing packages:

```bash
yarn add -D jest @testing-library/react @testing-library/jest-dom @testing-library/user-event jest-environment-jsdom @types/jest
```

**Packages installed:**
- `jest` - JavaScript testing framework
- `@testing-library/react` - React component testing utilities
- `@testing-library/jest-dom` - Custom Jest matchers for DOM
- `@testing-library/user-event` - User interaction simulation
- `jest-environment-jsdom` - DOM environment for tests
- `@types/jest` - TypeScript type definitions for Jest

### 2. Verify Configuration Files

The following configuration files have been created:

#### `jest.config.js`
Contains Jest configuration for Next.js, including:
- Path aliases (`@/*`)
- Test environment (jsdom)
- Coverage thresholds (70%)
- Test file patterns

#### `jest.setup.js`
Sets up test environment with:
- Testing library matchers
- Environment variable mocks
- Next.js router mocks
- Framer Motion mocks
- Global test utilities

### 3. Verify Test Structure

Ensure the following directory structure exists:

```
__tests__/
├── api/
│   ├── auth.test.ts
│   ├── videos.test.ts
│   ├── learning.test.ts
│   ├── dashboard.test.ts
│   └── chatbot.test.ts
├── components/
│   ├── FlashcardViewer.test.tsx
│   ├── QuizInterface.test.tsx
│   └── ChatBot.test.tsx
├── integration/
│   └── user-flows.test.ts
├── utils/
│   └── test-helpers.ts
└── README.md
```

### 4. Run Tests

#### Run All Tests
```bash
yarn test
```

#### Run Tests in Watch Mode (Recommended for Development)
```bash
yarn test:watch
```

This will automatically re-run tests when you make changes to files.

#### Run Tests with Coverage Report
```bash
yarn test:coverage
```

This generates a detailed coverage report in the `coverage/` directory.

#### Run Tests for CI/CD
```bash
yarn test:ci
```

This runs tests with CI-optimized settings (limited workers, coverage enabled).

### 5. Understanding Test Output

#### Successful Test Run
```
 PASS  __tests__/api/auth.test.ts
 PASS  __tests__/api/videos.test.ts
 PASS  __tests__/components/FlashcardViewer.test.tsx

Test Suites: 8 passed, 8 total
Tests:       127 passed, 127 total
Snapshots:   0 total
Time:        15.234s
```

#### Failed Test
```
 FAIL  __tests__/api/auth.test.ts
  ● Authentication API › POST /api/auth/signup › should create a new user account

    expect(received).toBe(expected)

    Expected: 201
    Received: 400

      at Object.<anonymous> (__tests__/api/auth.test.ts:25:28)
```

#### Coverage Report
```
------------------|---------|----------|---------|---------|-------------------
File              | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s
------------------|---------|----------|---------|---------|-------------------
All files         |   85.23 |    78.45 |   82.67 |   85.12 |
 api/auth         |   92.15 |    87.32 |   90.00 |   92.00 |
 api/videos       |   78.45 |    72.10 |   75.50 |   78.30 | 45-52, 78-82
------------------|---------|----------|---------|---------|-------------------
```

## Test Coverage Overview

### API Tests (127 test cases)

**Authentication (27 tests)**
- User signup with validation
- User signin with credentials
- JWT token management
- Session persistence
- Password security

**Video Processing (24 tests)**
- YouTube URL validation
- Transcript extraction
- LLM material generation
- Video listing and filtering
- Authorization checks

**Learning Materials (35 tests)**
- Flashcard CRUD operations
- Quiz submission and scoring
- Progress tracking
- Mind map generation
- Notes management

**Dashboard (26 tests)**
- Statistics aggregation
- Activity logging and filtering
- Study heatmap generation
- Streak calculation
- Preferences management

**Chatbot (15 tests)**
- RAG-based Q&A
- Context retrieval
- Conversation management
- Rate limiting
- Embedding generation

### Component Tests (45 test cases)

- FlashcardViewer: Card display, flip animation, navigation, keyboard shortcuts
- QuizInterface: Question rendering, scoring, feedback, completion
- ChatBot: Message sending, conversation display, loading states

### Integration Tests (12 test cases)

- New user onboarding flow
- Complete learning session
- Multi-video study session
- Custom flashcard creation
- Prerequisite checking
- Progress tracking
- Authentication persistence
- Error recovery

## Common Testing Scenarios

### Testing a New API Endpoint

```typescript
// __tests__/api/my-feature.test.ts
import { NextRequest } from 'next/server'
import { GET } from '@/app/api/my-feature/route'

describe('My Feature API', () => {
  it('should handle GET request', async () => {
    const request = new NextRequest('http://localhost:3000/api/my-feature', {
      headers: {
        Cookie: 'token=valid-jwt-token',
      },
    })

    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
  })
})
```

### Testing a React Component

```typescript
// __tests__/components/MyComponent.test.tsx
import { render, screen, fireEvent } from '@testing-library/react'
import MyComponent from '@/components/MyComponent'

describe('MyComponent', () => {
  it('should render and handle clicks', () => {
    render(<MyComponent />)

    const button = screen.getByRole('button')
    fireEvent.click(button)

    expect(screen.getByText('Clicked!')).toBeInTheDocument()
  })
})
```

### Testing an Integration Flow

```typescript
// __tests__/integration/my-flow.test.ts
describe('My User Flow', () => {
  it('should complete the flow end-to-end', async () => {
    // 1. Authenticate
    const authResponse = await fetch('/api/auth/signin', {
      method: 'POST',
      body: JSON.stringify({ email: 'test@example.com', password: 'pass' }),
    })
    const { token } = await authResponse.json()

    // 2. Perform action
    const actionResponse = await fetch('/api/my-action', {
      headers: { Cookie: `token=${token}` },
    })

    expect(actionResponse.status).toBe(200)
  })
})
```

## Troubleshooting

### Tests Fail with "Cannot find module '@/...'"

**Solution:** Verify `jest.config.js` has correct path mapping:

```javascript
moduleNameMapper: {
  '^@/(.*)$': '<rootDir>/$1',
}
```

### Tests Hang or Timeout

**Solution 1:** Increase timeout for specific tests:
```typescript
it('long test', async () => {
  // ...
}, 30000) // 30 seconds
```

**Solution 2:** Find open handles:
```bash
yarn test --detectOpenHandles
```

### Mock Not Working

**Solution:** Ensure mock is declared before imports:

```typescript
// ✅ Correct
jest.mock('@/lib/myModule')
import { myFunction } from '@/lib/myModule'

// ❌ Wrong
import { myFunction } from '@/lib/myModule'
jest.mock('@/lib/myModule')
```

### Coverage Below Threshold

**Solution:** Identify uncovered code:

```bash
yarn test:coverage
```

Open `coverage/lcov-report/index.html` to see which lines need tests.

### Environment Variables Not Available

**Solution:** Add to `jest.setup.js`:

```javascript
process.env.MY_VAR = 'test-value'
```

## Best Practices

### 1. Write Tests as You Code

Don't write all tests at the end. Write tests alongside your feature development:

- Write test first (TDD approach) OR
- Write test immediately after implementing feature

### 2. Test Behavior, Not Implementation

Focus on what users experience, not internal state:

```typescript
// ❌ Bad
expect(component.state.count).toBe(5)

// ✅ Good
expect(screen.getByText('Count: 5')).toBeInTheDocument()
```

### 3. Use Descriptive Test Names

Test names should clearly state what is being tested:

```typescript
// ❌ Bad
it('test 1', () => { /* ... */ })

// ✅ Good
it('should display error message when email is invalid', () => { /* ... */ })
```

### 4. Keep Tests Independent

Each test should be able to run independently:

```typescript
beforeEach(() => {
  jest.clearAllMocks() // Clear mocks before each test
})
```

### 5. Test Edge Cases

Always test:
- Empty data
- Error states
- Loading states
- Boundary conditions (first/last items)
- Invalid inputs

### 6. Mock External Dependencies

Don't make real API calls or database queries in tests:

```typescript
jest.mock('@/lib/mongodb')
jest.mock('@/lib/sdk')
```

## Integration with CI/CD

### GitHub Actions

Create `.github/workflows/test.yml`:

```yaml
name: Tests

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
          cache: 'yarn'

      - name: Install dependencies
        run: yarn install --frozen-lockfile

      - name: Run tests
        run: yarn test:ci

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info
```

### Pre-commit Hook

Install Husky to run tests before commits:

```bash
yarn add -D husky

# Initialize Husky
npx husky init

# Add pre-commit hook
echo "yarn test" > .husky/pre-commit
```

## Viewing Coverage Reports

After running `yarn test:coverage`:

1. Open `coverage/lcov-report/index.html` in your browser
2. Navigate through files to see line-by-line coverage
3. Red lines = not covered by tests
4. Green lines = covered by tests

**Coverage Goals:**
- Aim for 80%+ coverage on critical features
- Maintain 70%+ overall coverage (enforced by Jest)
- Focus on testing core business logic

## Quick Reference

```bash
# Install dependencies
yarn add -D jest @testing-library/react @testing-library/jest-dom @testing-library/user-event jest-environment-jsdom @types/jest

# Run all tests
yarn test

# Watch mode (development)
yarn test:watch

# Coverage report
yarn test:coverage

# Run specific test file
yarn test __tests__/api/auth.test.ts

# Run tests matching pattern
yarn test --testNamePattern="signup"

# Update snapshots
yarn test -u

# Find open handles
yarn test --detectOpenHandles
```

## Resources

- **Jest Documentation:** https://jestjs.io/docs/getting-started
- **React Testing Library:** https://testing-library.com/docs/react-testing-library/intro/
- **Next.js Testing:** https://nextjs.org/docs/testing
- **Test Helpers:** See `__tests__/utils/test-helpers.ts` for mock data and utilities
- **Full Test Docs:** See `__tests__/README.md`

## Next Steps

1. ✅ Install testing dependencies
2. ✅ Verify configuration files exist
3. ✅ Run `yarn test` to ensure all tests pass
4. ✅ Review `__tests__/README.md` for detailed documentation
5. ✅ Start writing tests for new features
6. ✅ Set up CI/CD integration (optional)

---

**Questions or Issues?** Refer to the Troubleshooting section above or check existing test files for examples.
