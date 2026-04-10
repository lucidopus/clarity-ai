# app/api/ — API Route Handlers

All Next.js API route handlers. Every leaf directory contains a `route.ts` file exporting HTTP method handlers (GET, POST, PATCH, DELETE).

## Auth (`auth/`)

| Route | Methods | Description |
|-------|---------|-------------|
| `auth/signup` | POST | Registers a new user, hashes password, sends OTP verification email. |
| `auth/signin` | POST | Validates credentials, issues JWT cookie (supports "remember me"). |
| `auth/logout` | POST | Clears the JWT cookie to end the session. |
| `auth/me` | GET | Decodes JWT cookie and returns the current user's profile. |
| `auth/verify-email` | POST | Validates OTP, marks `emailVerified: true` on the user. |
| `auth/resend-verification` | POST | Regenerates and resends the verification OTP email. |
| `auth/track-login` | POST | Records a login activity event in ActivityLog. |

## Videos (`videos/`)

| Route | Methods | Description |
|-------|---------|-------------|
| `videos/` | GET | Returns paginated list of the authenticated user's processed videos. |
| `videos/process` | POST | Main pipeline: extracts transcript, calls LLM, stores all learning materials. |
| `videos/[videoId]` | GET, DELETE | Fetch or delete a specific video and all associated data. |
| `videos/[videoId]/materials` | GET | Returns all learning materials (flashcards, quizzes, transcript, mind map) for a video. |
| `videos/[videoId]/validation-action` | POST | User override for content validator decision (force-allow a video). |
| `videos/[videoId]/visibility` | PATCH | Toggles a video's public/private visibility flag. |

## Learning (`learning/`)

| Route | Methods | Description |
|-------|---------|-------------|
| `learning/flashcards/progress` | POST | Records a flashcard review event and updates mastery progress. |
| `learning/quizzes/submit` | POST | Saves a quiz attempt result and updates Progress document. |
| `learning/quizzes/reset` | POST | Deletes quiz attempt history so user can retake. |
| `learning/userFlashcards` | GET, POST, DELETE | CRUD for user-created custom flashcards. |

## Dashboard (`dashboard/`)

| Route | Methods | Description |
|-------|---------|-------------|
| `dashboard/stats` | GET | Aggregate stats: video count, flashcard mastery, quiz score, streak. Redis-cached 5 min (`dashStats` key); invalidated after quiz/flashcard activity. |
| `dashboard/activity` | GET | Recent activity log entries for the home tab feed. Flashcard/quiz counts batched into 2 aggregations (not N+1). |
| `dashboard/activity-heatmap` | GET | Daily activity counts for the calendar heatmap. |
| `dashboard/insights` | GET | AI-generated learning insights and motivational nudges. |

## Chatbot (`chatbot/`)

| Route | Methods | Description |
|-------|---------|-------------|
| `chatbot/ask` | POST | Handles Clara chatbot messages with tool-calling support: context retrieval, LLM response, and optional `render_animation` tool invocation for inline math animations. Returns Markdown with embedded `animation` code blocks when enabled via `ENABLE_ANIMATION_TOOL`. |
| `chatbot/guide` | POST | Handles AI Guide messages with a different system prompt. |
| `chatbot/history` | GET, DELETE | Loads or clears chat history by channel (chatbot vs. guide). |

## Admin (`admin/`)

| Route | Methods | Description |
|-------|---------|-------------|
| `admin/auth/login` | POST | Verifies `ADMIN_PASSWORD`, issues admin JWT cookie. |
| `admin/auth/logout` | POST | Clears the admin JWT cookie. |
| `admin/auth/verify` | GET | Checks if the admin JWT cookie is valid. |
| `admin/analytics/summary` | GET | Platform stats: total users, videos, etc. |
| `admin/analytics/registrations` | GET | Time-series registration data for charts. |
| `admin/analytics/activity-heatmap` | GET | Platform-wide activity heatmap data. |
| `admin/analytics/costs/summary` | GET | Total API cost summary. |
| `admin/analytics/costs/by-source` | GET | Cost breakdown by service/source. |
| `admin/analytics/costs/models` | GET | Cost breakdown by LLM model. |
| `admin/analytics/costs/services` | GET | Cost breakdown by feature/service. |
| `admin/analytics/costs/heatmap` | GET | Cost heatmap by day/hour. |
| `admin/analytics/costs/tokens-trend` | GET | Token usage trend over time. |
| `admin/analytics/costs/users` | GET | Cost breakdown per user. |
| `admin/users` | GET | Paginated user list with activity counts. |
| `admin/users/[userId]` | GET, DELETE | Fetch or cascade-delete a specific user. |
| `admin/users/[userId]/items/[itemType]/[itemId]` | DELETE | Deletes a single generation item for a user. |
| `admin/generate-mindmaps` | POST | Admin tool to retroactively generate missing mind maps. |

## Other Routes

| Route | Methods | Description |
|-------|---------|-------------|
| `activity/log` | POST | Client-side activity logger; writes to ActivityLog collection. |
| `discover` | GET | Personalized category rows for Discover tab (Redis-cached). |
| `search` | GET | Semantic search across user's video library using vector embeddings. |
| `casestudy/[videoId]/[caseStudyId]` | GET, POST, PATCH, DELETE | CRUD for real-world case study items linked to a video. |
| `solutions` | GET, POST | List or create AI-generated solution workspaces. |
| `notes/[videoId]` | GET, PUT | Read or save transcript-segment notes. |
| `mindmaps/update` | POST | Saves manual edits to mind map node/edge positions. |
| `preferences` | GET, PUT | Read or update full learning preferences (triggers re-embedding). |
| `preferences/general` | GET, PUT | Read or update general preferences (theme, notifications). |
| `user/profile` | GET, PATCH | Fetch or update user's public profile fields. |
| `account` | DELETE | Deletes the authenticated user's entire account and all data. |
| `test/proxy` | GET | Diagnostic endpoint to verify Webshare proxy connectivity. |
