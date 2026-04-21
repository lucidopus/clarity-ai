# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- **Forgot Password (OTP)**: End-to-end password-reset flow replacing the prior URL-token design.
  - `POST /api/auth/forgot-password` — generates a 6-digit OTP, stores a bcrypt-hashed `password_reset` `VerificationToken` (10-min expiry), and emails it. 5/15-min IP rate limit, 60-second resend throttle, and a constant-shape response to prevent email enumeration.
  - `POST /api/auth/verify-reset-otp` (new) — verifies the OTP (max 5 attempts / token, 10/15-min IP ceiling), deletes the token on success, and issues a short-lived HS256 reset-ticket JWT (`purpose: 'password_reset'`, 10-min expiry).
  - `POST /api/auth/reset-password` — accepts `{resetTicket, newPassword, confirmPassword}`, validates the ticket and password strength (`passwordSchema`), updates the user's hash, and issues a session JWT cookie so the user is signed in immediately.
  - `app/auth/forgot-password/page.tsx` — new three-step stepper UI (email → OTP → new password) with resend cooldown, auto-advancing OTP boxes, show/hide password toggle, and auto-redirect to `/onboarding` or `/dashboard` after success.
  - `app/auth/signin/page.tsx` — "Forgot password?" link added next to the password field.
  - `lib/email.ts` — `sendPasswordResetEmail` reshaped to send an OTP code (matching the verify-email template) instead of a reset URL.
  - `lib/models/ActivityLog.ts` — added `password_reset_requested`, `password_reset_otp_verified`, `password_reset_completed` activity types.
- **Show/Hide Password Toggles**: Inline eye-icon toggles added to password inputs on signin and signup (two independent toggles on signup so password and confirm-password can be revealed separately).
- **Brand-new-user Empty Dashboard**: When a user has no videos, flashcards, or quiz attempts, the dashboard home replaces the grid of zero-value widgets with a dedicated welcome surface — gradient hero, "Start with a source" quick-start cards (YouTube / Document / Text / Audio), a "What you'll build" feature strip, and a personalized nudge. New component: `components/dashboard/EmptyDashboard.tsx`.

- **App-Wide Performance Improvements (Issue #102)**: Eliminated N+1 query patterns, replaced ephemeral in-memory caches with Redis, and reduced initial JS bundle size.
  - New `lib/cache.ts`: centralized `getCached<T>()` helper (Redis hit → DB fallback on error), `CacheKeys` factory, and `invalidate*` helpers for readiness, insights, dashStats
  - `lib/redis.ts`: lazy `getRedis()` initialization — no crash on missing `REDIS_URL` at module import time
  - `lib/services/readinessScore.ts` + `clarityInsights.ts`: in-memory `Map` caches replaced with Redis (previously wiped on every serverless cold start)
  - `app/api/dashboard/stats/route.ts`: wrapped in `getCached(dashStats, 300s)`; fixed dynamic `Quiz` import to top-level
  - `app/api/dashboard/activity/route.ts`: 2×N per-video flashcard/quiz counts replaced with 2 batch aggregations
  - `app/api/admin/users/route.ts`: 80–100 queries per page replaced with 5 parallel `$group` aggregations + Map lookup
  - `app/api/flashcards/review` + `quizzes/submit`: fire-and-forget recompute replaced with targeted cache invalidation
  - All read-only GET routes now return `private, max-age=N` Cache-Control headers instead of `no-store`
  - `FocusHoursChart`, `FlashcardDifficultyDonut`, `WeekdayConsistencyBars` lazy-loaded via `next/dynamic({ ssr: false })` — chart.js excluded from initial bundle

- **Trigger.dev Background Video Processing**: Migrated the video processing pipeline from synchronous Vercel serverless functions to Trigger.dev background tasks (15-minute max duration), eliminating the 60s timeout constraint.
  - Thin API route returns 202 immediately after triggering the background task
  - New `GET /api/videos/[videoId]/status` polling endpoint for processing state
  - Processing UI with spinner, thumbnail preview, and live status polling on the generations page
  - Orphan recovery in the retry-failed-videos task
- **Multi-Source Content Support** (Issues #91–#93): Extended the platform beyond YouTube to support documents, audio files, and plain text as learning material sources.
  - **Plain Text**: Direct text input via the Generate modal with a dedicated text extractor
  - **Documents**: PDF (page-by-page extraction) and PPTX (JSZip) support
  - **Audio**: File transcription via Groq Whisper (whisper-large-v3)
  - **File Upload API**: `POST /api/upload` with Supabase Storage integration and cleanup on deletion
  - **GenerateModal Tabs**: New Document and Audio tabs for file-based source submission
  - **New Environment Variables**: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- **Source-Specific Content Viewers (Issue #93)**: Dedicated viewer components per source type, with `MultiSourceViewer` for tabbed multi-source navigation.
  - `DocumentContentViewer` — page-aware document reading experience
  - `AudioContentViewer` — audio playback with transcript view
  - `TextContentViewer` — clean reading pane for text sources
  - `MultiSourceViewer` — segmented tab control to switch between sources; non-YouTube sources no longer fall back to a broken YouTube embed
- **Live Lecture Capture**: Complete live lecture feature for capturing and learning from in-person or recorded lectures in real time.
  - Browser-based audio capture with ElevenLabs Scribe V2 real-time transcription
  - Floating Granola-inspired bubble UI during live sessions
  - Mid-lecture Q&A via Clara chatbot with context-aware answers
  - Post-lecture dual-rail timeline merging transcript segments, markers, Q&A pairs, and user notes
  - 3-layer storage: React state → IndexedDB (instant) → MongoDB (10s sync) for crash resilience
  - Crash recovery: resumes previous session from IndexedDB / server state on reload
  - Toast notifications for capture start, pause, resume, and end events
  - New `LiveSession` MongoDB model
  - New API endpoints: `POST /api/live-lecture/token`, `POST /api/live-lecture/ask`, `POST /api/live-lecture/end`, `POST /api/live-lecture/sync`, `GET /api/live-lecture/[sessionId]`, `GET /api/live-lecture/[sessionId]/status`, `GET /api/live-lecture/by-source/[sourceId]`, `POST /api/live-lecture/[sessionId]/notes`
- **AI Suggestion Tracking**: Implemented a system to save AI suggestions to Supabase as they appear in the UI.
- **Post-Call Analysis Suggestions**: Added an interactive UI pill in post-call analysis to display triggered AI suggestions on hover.
- **AI-Powered Personalized Discovery Feed**:
  - **Vector Search Engine**: Implemented semantic video recommendations using Google Gemini embeddings for content similarity matching.
  - **Redis Caching**: Integrated Upstash Redis for high-performance caching of personalized recommendation pools (6-hour TTL).
  - **Trigger.dev Background Jobs**: Automated scheduled recommendation updates every 6 hours for all users via background job orchestration.
  - **Context-Aware Categorization**: Dynamic content organization based on user preferences, learning goals, and available study time:
    - **For You**: Top personalized picks based on vector similarity scores
    - **Quick Wins** (<5 min): Boosted for users with limited daily time
    - **Lunch Break Learning** (15-30 min): Optimized for moderate study sessions
    - **Deep Dives** (45+ min): Prioritized for users with extended learning time
    - **Code & Build**: Tech and programming content weighted by user role and goals
    - **Creator's Studio**: Design and creative content for content creators
    - **Entrepreneur Essentials**: Business and startup content for professionals
    - **Visual Learning**: Videos with complete mind maps for visual learners
    - **Interactive Sessions**: Content with quizzes for hands-on learners
  - **Smart Deduplication**: Automatically filters out already-watched videos from recommendations.
  - **New API Endpoints**:
    - `GET /api/discover` - Fetch personalized discovery feed with categorized recommendations
    - `GET /api/search` - Semantic search using vector embeddings
    - `POST /api/preferences` - Save user preferences and trigger immediate recommendation update
  - **New Environment Variables**: `REDIS_URL`, `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`, `TRIGGER_SECRET_KEY`
- **Enhanced Onboarding Flow**:
  - **Detailed User Preferences**: Comprehensive preference collection including learning role (Student/Professional/Creator), daily study time, learning goals, and preferred material types.
  - **Immediate Personalization**: Triggers recommendation generation upon onboarding completion for instant personalized content.
  - **Preference-Driven Discovery**: User preferences directly influence content categorization weights and row prioritization.
- **Video Player Enhancements**:
  - **Refactored Modals (Portals)**: Updated `VideoSummaryButton` and `ChapterButton` to use **React Portals**. This ensures popups break out of the DOM hierarchy and overlay correctly on top of the sidebar/navbar (Issue #71).
  - **UI Polish**: Fixed clustering of tooltips and optimized z-indexing for smoother hover states in Dark Mode.
- **Documentation**:
  - **Tags**: Added comprehensive project tags in `TAGS.md` for better issue tracking.
- **Admin Portal**: Comprehensive password-protected admin portal at `/admin` for platform monitoring and user management.
  - **Authentication**: Password-only login with JWT-based session management, rate limiting (5 attempts per 15 minutes), and audit logging.
  - **Analytics Dashboard**: Platform-wide metrics including user statistics, content overview, registration timeline charts (week/month/year views), and activity heatmaps.
  - **User Management**: Search and filter users, view detailed profiles with generation counts, cascade delete users with all associated data, and delete individual items.
  - **New API Endpoints**:
    - `POST /api/admin/auth/login` - Admin login
    - `POST /api/admin/auth/logout` - Admin logout
    - `GET /api/admin/auth/verify` - Verify admin session
    - `GET /api/admin/users` - List users with search and pagination
    - `GET /api/admin/users/[userId]` - Get detailed user profile
    - `DELETE /api/admin/users/[userId]` - Delete user and all data
    - `DELETE /api/admin/users/[userId]/items/[itemType]/[itemId]` - Delete individual items
    - `GET /api/admin/analytics/summary` - Get summary statistics
    - `GET /api/admin/analytics/registrations` - Get registration timeline
    - `GET /api/admin/analytics/activity-heatmap` - Get activity heatmap
  - **New Models**: `AdminLoginAttempt` for rate limiting and audit logging.
  - **Environment Variable**: `ADMIN_PASSWORD` for admin authentication.
- **Cost Tracking System**: Comprehensive API usage tracking and billing records for all third-party services.
  - **Automatic Cost Logging**: Every video generation automatically logs costs to MongoDB `costs` collection
  - **Model-Based Pricing Dictionary**: Flexible, service-agnostic pricing configuration supporting any LLM provider (Groq, OpenAI, Anthropic, Google, etc.) with zero code changes
  - **Multi-Service Support**: Tracks costs for both Groq LLM (token-based) and Apify transcript extraction (fixed-cost)
  - **Detailed Usage Metrics**: Captures input/output tokens, execution duration, and generation metadata for each API call
  - **New Models**: `Cost` with `IServiceUsage` and `IUnitDetails` interfaces for flexible cost tracking
  - **New Utilities**:
    - `lib/cost/config.ts` - Model pricing dictionary with configurable rates
    - `lib/cost/calculator.ts` - Cost calculation functions for LLM tokens and Apify calls
    - `lib/cost/logger.ts` - Non-blocking cost logging to MongoDB with graceful error handling
  - **Environment Variable**: `LLM_MODEL` - Maps to pricing dictionary key for automatic cost calculation (e.g., `openai/gpt-oss-120b`, `llama-3.3-70b-versatile`, `qwen/qwen3-32b`)
  - **Pipeline Integration**: Integrated into `app/api/videos/process/route.ts` to track costs after transcript extraction and LLM generation
  - **Documentation**: Created comprehensive `docs/cost-tracking.md` with schema details, pricing rates, query examples, and instructions for adding new models
  - **Future-Ready**: Enables cost analysis, billing dashboards, per-user usage reports, and budget management features
- **Error Handling**: Added comprehensive error handling for video generation processes to improve user experience and system reliability (issue #56).
- **Feynman Mode**: Step-by-step guided explanations inspired by the Feynman Technique to deepen understanding of complex concepts with AI assistance.
- **Content Validation System**: AI-powered detection of non-educational videos with user override options, allowing rejection or approval to trigger material generation.
- **Read-Only Mode**: Shared content now displays in read-only mode, hiding interactive elements (chatbot, editing) for viewers who aren't the content owner.
- **Master Discovery Catalog**: Modular video categorization system using `CategorySelector` and `MasterCatalog` for dynamic, context-aware content organization.
- **Deep Focus Category**: New category type for users with extended study sessions (45+ minutes), integrated into context-based scoring logic.
- **AI Prompt Guardrails**: Defined scope, guardrails, and refusal policies within AI prompts to ensure safe and focused responses.
- **Markdown AI Summaries**: AI summaries now render with ReactMarkdown and custom prose styling for improved readability.
- **Session Stability Improvements**: Enhanced authentication error handling with retry logic and user-friendly error states.
  - Distinguished between invalid tokens (expected logout) and server errors (temporary issues)
  - Added 3-attempt retry logic with exponential backoff for transient failures
  - New "Service Unavailable" error UI in dashboard instead of silent redirects to login
- **Learning Profile Settings UI**: Redesigned the Learning Profile section in settings for a cleaner, and a more consistent look.
  - Moved "Edit Profile" button to section header (matching Account Information style)
  - Added styled badge showing remaining monthly updates with accent/red color coding
  - Removed redundant footer section for a more compact layout
- **Email Verification (Issue #84)**: OTP-based email verification during sign-up using SendGrid.
  - 6-digit cryptographically secure OTP with bcrypt hashing and 10-minute TTL
  - New `VerificationToken` MongoDB model with automatic TTL cleanup
  - `POST /api/auth/verify-email` and `POST /api/auth/resend-verification` endpoints
  - Verification UI page with 6-cell OTP input, auto-advance, paste support, masked email display
  - Route protection: dashboard, onboarding, and signin all enforce `emailVerified` flag
  - Activity logging for all verification events (sent, success, failed, resent)
  - Dev-mode fallback: logs OTP to console when SendGrid API key is not configured
- Created `CHANGELOG.md` to track project changes.
- **Agentic Clara — Interactive Math Animations (Phase 7, Issue #88)**:
  - `/visualize` slash command in Clara chatbot for interactive math animations
  - 8 animation templates: shape_transform, vector_addition, matrix_transform, function_graph, number_line, unit_circle, derivative_tangent, area_under_curve
  - Tool-calling framework via LangChain `.bindTools()` (`lib/tools/`)
  - AnimationRenderer with lazy loading (`next/dynamic`, `ssr: false`)
  - AnimationSpec discriminated union Zod schema for validated specs
  - WebGL/Canvas feature detection with static fallback
  - Activity logging for `animation_rendered` events and cost tracking
  - Streaming integration: Markdown code block protocol with `animation` language identifier
  - `ENABLE_ANIMATION_TOOL` feature flag environment variable

### Changed

- **Dashboard Sidebar — Hover-Expand Icon Rail**: Refactored the main dashboard sidebar to the same hover-expand pattern used on the generations page. The outer wrapper reserves only the rail width (64 px on tablet, 80 px on desktop) and an absolutely-positioned inner `motion.aside` animates to 256 px on mouse enter so the expanded panel floats over content instead of reflowing it. Icon column stays pinned, so icons don't shift during the transition. Replaces the prior click-to-toggle collapse.
- **Discover Hero — Edge-to-Edge**: Removed the `mx-auto max-w-[calc(100%-1rem)] sm:max-w-[98%]` constraints so the Top-Pick hero fills the content column cleanly (no visible page-background strips on the left/right edges).
- **Navbar Redesign**: Polished the marketing navbar with a frosted-glass backdrop blur effect, reduced height (h-14), refined typography, removed the "About" nav link, renamed "Sign Up" CTA to "Get Started", and improved mobile menu spacing and hover states.
- **Multi-Source Pipeline Polish**: Replaced source-switcher pills with a clean segmented tab control; source type icons now appear on gallery cards instead of the text label "YouTube"; NotesEditor and floating summary button restricted to YouTube sources only; default text source title is "Text Notes".
- **Live Lecture Panel UX**: Clara tab is always visible from session start; quick action buttons moved to a shared section independent of the active tab; resuming a session now restores previous chats, notes, and transcript from the server.
- **User Data Deletion**: Account, admin user, and individual video DELETE operations now cascade to `SourceContent`, `LiveSession`, and `Cost` records.
- **Card Background Color**: Updated global card background from `#FAFAF9` to `#F9FAFB` for improved consistency.
- **LLM Provider Switch**: Reverted the post-call analysis LLM from Gemini back to Groq to avoid rate limits and improve performance while maintaining PII masking and deanonymization.
- **Suggestion UI Polish**: Improved AI suggestion box typography, vertical spacing, and readability across themes.
- Updated `README.md` to include a new "Available Scripts" section.
- Updated `CLAUDE.md` to document the admin portal feature and environment variables.
- Created `.env.example` file with all required environment variables.
- **Admin Dashboard Improvements**:
  - Redesigned analytics charts with cyan accent color (#06B6D4) matching app theme in both light and dark modes
  - Charts now display side-by-side for better space utilization
  - Switched to radio-button style view toggles (Week/Month only, removed year)
  - Line chart for registrations with filled area and styled points
  - Simplified activity heatmap to show only Total Activities bar chart
  - Week view shows data by weekday (Sun, Mon, Tue, etc.)
  - Month view shows data by day of month (1-30/31)
  - Added cursor-pointer to all interactive elements for better UX
  - Custom tooltips with dark theme and proper formatting
  - Integrated Dialog component for delete confirmations (replaced browser alerts)
  - All metrics now display as integers (e.g., "17" instead of "17.0")
  - Fixed runtime error in user details modal (stats.totalVideos undefined)
  - Updated API endpoints for proper weekday/day aggregation
- **User Management UI Overhaul**:
  - Implemented collapsible filters to save vertical space and reduce clutter
  - Added tabbed interface in user details modal with 3 tabs: Overview, Videos, and Activity
  - Created gradient stat cards with themed icons and colors (cyan, purple, blue, emerald)
  - Added user avatar with initials in modal header
  - Display badges for user type and login streak with flame icon
  - Enhanced videos tab with thumbnail display and better metadata organization
  - Added tags for material types (Learning Material, Mind Map, Notes)
  - Implemented activity breakdown visualization with progress bars showing percentages
  - Reorganized "Danger Zone" section with clearer warnings
  - Improved overall visual hierarchy, spacing, and component organization
  - Better empty states with icons and helpful messages
- Enhanced case study workspace with panel borders for better visual separation
- **Default Video Visibility**: Changed default visibility to public for learning materials
- **Tag Styling**: Updated tag styling to use cyan colors across components with refined non-public video indicators
- Removed `ClassificationLog` Mongoose model (no longer needed with new validation system)
- **Task Parallelism**: Added task parallelism for cron job using `batchTriggerAndWait()`

### Fixed

- **Cross-User Data Leak via Browser HTTP Cache (Security)**: Authenticated per-user API responses could be served from the browser cache to a different user on the same device after logout/login — for example, User A's Clarity Score rendering in User B's dashboard. Root cause: `Cache-Control: private, max-age=…` on nine per-user endpoints. `private` only excludes shared caches; the browser still caches keyed by URL alone, not by the `jwt` cookie, so another user landing on the same URL within the TTL window received A's response. Switched all nine endpoints to `Cache-Control: private, no-store`; the server-side Redis layer (correctly keyed by `userId`) continues to absorb the expensive recompute, so there is no meaningful performance regression. Endpoints fixed: `readiness/aggregate`, `readiness/insights`, `readiness/[sourceId]`, `flashcards/stats`, `challenges/today`, `dashboard/progress-narrative`, `dashboard/activity`, `dashboard/stats`, `dashboard/clara-greeting`.
- **PDF Extraction in Trigger.dev**: Replaced `pdf-parse` with `unpdf` for container-compatible PDF extraction (pdf-parse uses Node.js native modules incompatible with Trigger.dev workers).
- **TypeScript Discriminated Union**: Fixed narrowing error in the live-lecture `extract-context` route where the discriminant wasn't recognized after a type assertion.
- **sourceId Mismatch**: Fixed `saveExtraction` using an extractor-generated UUID instead of the passed `sourceId`, causing orphaned SourceContent records.
- **Segments API 404 for Secondary Sources**: Fixed the `/api/videos/[videoId]/segments` endpoint returning 404 for non-primary sources by adding a fallback `allSourceIds` lookup.
- **ReactMarkdown Empty `src` Warning**: Fixed console error from empty `img` src attributes in ReactMarkdown output.
- **LiveLectureContentViewer Max Height**: Adjusted the maximum height constraint on the viewer to prevent overflow on smaller viewports.
- **Backend Application Initialization**: Resolved a critical ASGI app import error (`main` module) preventing the Uvicorn server from starting.
- **Frontend Build Issues**: Fixed `tailwindcss` dependency resolution conflicts that blocked the development server from starting.
- **Admin Analytics**: Fixed variable shadowing bug in summary endpoint where `activeUsersLast30Days` was referenced before initialization
- **Admin Analytics**: Fixed active users count exceeding total users by verifying users still exist in database before counting (excludes deleted users' orphaned activity logs)
- **Analytics Validation**: Completed analytics numbers validation to ensure accuracy of reported metrics (issue #50)
- **Category Selector**: Prevented `Essential` matcher from failing on missing `createdAt` field
- **Video Retry Logic**: Fixed `VALIDATION_OVERRIDE` error handling to correctly process user-approved non-educational videos

## [0.1.0] - 2025-11-09

### Added

- Initial commit of the project.
