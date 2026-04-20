# lib/ — Shared Library Code

All shared server-side and isomorphic library code for the Clarity AI platform.

## Top-Level Files

| File | Description |
|------|-------------|
| `sdk.ts` | Initializes all LLM clients (LangChain Groq, LangChain Gemini, raw Groq SDK). Single import point for `groqLlm`, `geminiLlm`, model constants. |
| `mongodb.ts` | Mongoose connection singleton; caches connection in `globalThis` to survive hot reload. |
| `auth-context.tsx` | React context (`AuthProvider` / `useAuth`) for client-side authentication state. |
| `config.ts` | App-wide constants: `CHATBOT_NAME`, `VIDEO_CATEGORIES`, rate-limit thresholds, feature flags. |
| `prompts.ts` | All LLM system prompts: learning materials, chatbot, AI guide. |
| `llm.ts` | Orchestrates learning-material generation: calls Groq/Gemini, validates with Zod, supports chunked generation. |
| `structuredOutput.ts` | Zod + JSON schemas for all LLM response types (flashcards, quizzes, timestamps, prerequisites, mind map, summary). |
| `structuredOutputPartial.ts` | Partial Zod schemas for chunked/sequential LLM generation (splits into multiple API calls). |
| `transcript.ts` | Fetches YouTube transcripts via `youtube-transcript-plus`; handles proxy routing and errors. |
| `embedding.ts` | Generates vector embeddings using Google Gemini (`text-embedding-004`) for semantic search and recommendations. |
| `chat-db.ts` | MongoDB persistence for chat messages: save, load, and delete by session/channel. |
| `chatbot-context.ts` | Assembles context objects (user profile, video materials) to inject into chatbot system prompts. |
| `limits.ts`             | Centralized rate limits, input size caps, and `UNLIMITED_MODE` switch. Single file to tune all limits. |
| `rate-limit.ts`         | MongoDB-backed atomic rate limiter (`checkRateLimitMongo`, `checkChatbotRateLimit`). Uses `ratelimits` collection with TTL. |
| `activityLogger.ts` | Client-side utility: POSTs activity events to `/api/activity/log`. |
| `serverActivityLogger.ts` | Server-side activity logger for API routes; writes directly to MongoDB (best-effort). |
| `adminAuth.ts` | Admin JWT utilities: issue, verify, and extract admin tokens from cookies. |
| `email.ts` | SendGrid integration for OTP verification emails; dev-mode fallback logs to console. |
| `otp.ts` | OTP utilities: generate 6-digit codes, hash with bcrypt, verify. |
| `redis.ts` | ioredis client with lazy `getRedis()` initialization (no crash on missing `REDIS_URL` at import time). Proxy-based default export for backward compatibility. |
| `cache.ts` | Centralized Redis cache module: `getCached<T>(key, fallback, ttlSec)` with transparent DB fallback on any Redis error, `CacheKeys` factory, and `invalidate*` helpers (`invalidateReadiness`, `invalidateUserInsights`, `invalidateDashStats`, `invalidateAllUserCaches`). |
| `catalog.ts` | Static catalog of curated educational videos organized by `CategoryType`. |
| `content-validator.ts` | LLM-based content validation: determines if a video is educational before processing. |
| `video-retry-processing.ts` | Retry logic for failed video processing with error classification. |
| `mindMapLayout.ts` | Uses `@dagrejs/dagre` to compute automatic node/edge layout for mind maps. |
| `date.utils.ts` | Date normalization utilities: timezone-aware UTC day resolution for heatmaps. |
| `errorMessages.ts` | Maps backend error codes to user-friendly UI content. |
| `service-utils.ts` | Service ID to human label mapping for cost analytics. |
| `test-pipeline.ts` | Mock pipeline fixture for the test-process API endpoint. |

## Subdirectories

| Directory | Description |
|-----------|-------------|
| `models/` | Mongoose model definitions (User, Video, Flashcard, Quiz, Progress, ActivityLog, Note, MindMap, Solution, Cost, Alert, SystemLog, VerificationToken). All export TypeScript interfaces + Mongoose models. |
| `types/` | Pure TypeScript interfaces: `ChatMessage`, `INote`, `ISegmentNote`. |
| `errors/` | Custom error classes: `TranscriptUnavailableError`, `LLMAuthenticationError`, etc. |
| `utils/` | Pure utility functions: error classification, psychometric scoring, transcript processing. |
| `cost/` | API cost tracking: pricing config, cost calculator, MongoDB logger. |
| `tools/` | LangChain tool definitions for Clara's agentic capabilities: `render-animation.ts` (animation tool), shared `.bindTools()` utilities. |
| `types/animation.ts` | AnimationSpec Zod discriminated union schema for 8 animation template types. |
| `utils/webgl-detect.ts` | WebGL/Canvas/SVG feature detection for animation rendering fallback chain. |
| `services/` | Business-logic services: category selector for Discover recommendations, `echo.ts` (Clarity Mode Echo CRUD + sweep), `pauseBudget.ts` (pause-budget formula), `studyContract.ts` (contract window math, `contractSessionDate`, `contractWindowMinutes`, edit-budget + pending-resolution + extension-aware `effectiveWindowAt` / `minutesUntilWindowEnd`). |
| `chatbot/` | `clarityModeContext.ts` — builds the `## Clarity Mode` natural-language block appended to Clara's system prompt when the user is inside their study window. State-only; no behavioral rules. |
| `focus-mode/` | Client-side hooks for Clarity Mode: `FocusModeContext.tsx` (window state, transition flags, `echoPromptDue`), `use-pause-budget.ts` (server-anchored pause accounting). |
