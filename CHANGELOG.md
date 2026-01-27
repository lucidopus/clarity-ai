# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

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
- **Learning Profile Settings UI**: Redesigned the Learning Profile section in settings for a cleaner, more consistent look.
  - Moved "Edit Profile" button to section header (matching Account Information style)
  - Added styled badge showing remaining monthly updates with accent/red color coding
  - Removed redundant footer section for a more compact layout
- Created `CHANGELOG.md` to track project changes.

### Changed

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

- **Admin Analytics**: Fixed variable shadowing bug in summary endpoint where `activeUsersLast30Days` was referenced before initialization
- **Admin Analytics**: Fixed active users count exceeding total users by verifying users still exist in database before counting (excludes deleted users' orphaned activity logs)
- **Analytics Validation**: Completed analytics numbers validation to ensure accuracy of reported metrics (issue #50)
- **Category Selector**: Prevented `Essential` matcher from failing on missing `createdAt` field
- **Video Retry Logic**: Fixed `VALIDATION_OVERRIDE` error handling to correctly process user-approved non-educational videos

## [0.1.0] - 2025-11-09

### Added

- Initial commit of the project.
