# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Clarity AI is an AI-powered educational platform that transforms passive YouTube video watching into active learning experiences. It automatically generates personalized study materials (flashcards, quizzes, interactive transcripts, prerequisite checks, and Clara chatbot) from educational videos for undergraduate and graduate students.

**Core Mission**: Remove friction between watching educational videos and mastering their content through evidence-based active learning techniques.

## Tech Stack

- **Framework**: Next.js 16 with App Router and TypeScript
- **Styling**: Tailwind CSS v4 with PostCSS
- **Database**: MongoDB (already configured, clarity-ai database)
- **LLM Provider**: Groq (gpt-4o-120b model with structured outputs/function calling)
- **Transcript API**: `youtube-transcript-plus` v1.1.1 (open source, no API key needed)
- **React**: v19.2.0
- **Authentication**: JWT-based with HTTP-only cookies (simple, no refresh tokens)
- **Animations**: Framer Motion (for smooth micro-interactions)

## Development Commands

```bash
# Development
yarn dev          # Start Next.js dev server (http://localhost:3000)

# Production
yarn build        # Build for production
yarn start           # Start production server

# Code Quality
yarn lint        # Run ESLint (uses eslint-config-next)
```

## Project Architecture

### Application Structure

This is a Next.js App Router application with the following high-level structure:

**Dashboard Architecture** (Planned - See docs/PROJECT_PLAN.md):
- **Home Tab**: Analytics dashboard showing learning progress, videos processed, study streaks
- **Generate Tab**: Main pipeline - URL input → transcript extraction → LLM processing → material generation
- **Gallery Tab**: Visual library of all processed videos with search/filter capabilities

**Video Processing Pipeline** (Core feature to implement):
1. User submits YouTube URL
2. Extract transcript via public API
3. Feed transcript to LLM with structured prompts
4. Generate 4-5 learning components in one pass (flashcards, quizzes, timestamps, prerequisites, chatbot context)
5. Display materials in organized layout
6. Save to MongoDB for persistence
7. Add to user's gallery automatically

### Data Flow

**User Journey**:
1. Authentication → Personal Dashboard
2. Submit YouTube URL → Processing Pipeline
3. Generated Materials Display → MongoDB Storage
4. Gallery Access → Quick Material Retrieval
5. Interactive Learning → Progress Tracking

**Learning Materials Generated** (Priority order for MVP):
1. Flash Cards (AI-generated + user-created with "generation effect")
2. Quizzes (multiple-choice, true/false, fill-in-blank with explanations)
3. Timestamps (interactive transcript with video navigation)
4. Pre-requisite Check (background knowledge assessment with chatbot integration)
5. Clara (RAG-based, context-aware tutor - Stage 3/4 feature)

### TypeScript Configuration

- Path alias: `@/*` maps to root directory
- Strict mode enabled
- JSX mode: `react-jsx` (Next.js 19+ style)
- Module resolution: `bundler`

### Styling Approach

- Tailwind CSS v4 (latest)
- Dark mode support via `dark:` classes
- Custom fonts: Geist Sans and Geist Mono (loaded via `next/font/google`)
- Minimal, clean design philosophy

## Design Principles - CRITICAL

**All work must strictly adhere to `/docs/context/design-principles.md`**

This is NOT optional. Every component, page, and interaction must follow these principles:

### Key Design Principles

**Modern Minimalist Aesthetic**
- Clean, clutter-free layouts inspired by Linear, Stripe, Apple
- Ample whitespace (breathing room between elements)
- Clear visual hierarchy (size, color, placement guide the eye)
- Every element must serve a purpose - no decorative clutter
- Use generous negative space for premium, elegant feel

**Vibrant & Cohesive Color Palette**
- Neutral base: whites, light grays (light mode), deep charcoals (dark mode)
- Single vibrant accent color (bright cyan, purple, or teal) for energy
- Consistent palette throughout - no chaotic colors
- High contrast text: WCAG 4.5:1 or better (light AND dark modes)
- Vibrant color used sparingly - only for CTAs, active states, highlights

**Clean Typography & Iconography**
- Modern sans-serif font (Geist Sans already chosen)
- Clear type scale: large title → section header → body → caption
- Consistent font sizes/weights across similar elements
- Simple, geometric icons (line-based, rounded corners)
- Icons use neutral colors, accent color only for active states

**Smooth & Purposeful Animations**
- Subtle micro-interactions ONLY (200-300ms duration)
- Every animation must serve a UX purpose (feedback, guidance, delight)
- NO heavy or long animations that frustrate users
- Easing curves: ease-out for natural feel
- Flashcard flip: smooth 3D rotation (300ms)
- Button hover: gentle color change or slight lift
- Tab transitions: fade or slide content gracefully
- Examples: Stripe, Apple, Figma designs

**Light & Dark Mode (Dual Theme)**
- BOTH themes must look equally polished
- Not just color inversion - thoughtful dark mode design
- Use deep grays/soft blacks (not pure #000)
- Light gray/off-white text on dark (reduce eye strain)
- Shadows in dark mode: use subtle highlights/semi-transparent white
- All colors must work in both modes - test extensively

**Consistency & Accessibility**
- Unified component design system (same style buttons, cards, modals everywhere)
- Buttons: Same corner radius, font, spacing across all variants
- Responsive design: Works perfectly on mobile, tablet, desktop
- Keyboard navigation: Tab order logical, focus states visible
- Color not alone: Icons/labels in addition to color for states
- Text scaling: Allow users to increase font size without breaking layout

### Accessibility Requirements (WCAG 2.1 AA Minimum)

- Contrast ratio 4.5:1 or better for body text
- Focus states visible on all interactive elements
- Semantic HTML (proper heading hierarchy, labels)
- Keyboard navigable (no mouse-only interactions)
- Screen reader compatible (alt text, ARIA labels)
- Touch targets 44px+ minimum size
- Never rely on color alone to convey information

### How to Apply These Principles

1. **Every new component**: Create with dark mode in mind from the start
2. **Every page**: Reference design-principles.md before coding
3. **Every interaction**: Is this animation purposeful? Does it delight without distracting?
4. **Every color choice**: Does this work in light AND dark mode? Is it accessible?
5. **Test constantly**: Switch theme, test on mobile, use keyboard navigation

### Red Flags (Don't Do This)

❌ Bright colors used excessively (looks chaotic, not premium)
❌ Long animations that feel laggy or interrupt users
❌ Different button styles on different pages (inconsistent)
❌ Color-only error indicators (not accessible)
❌ Dark mode that's an afterthought (looks worse than light mode)
❌ Cluttered layouts with too many elements (overwhelming)
❌ Tiny text that's hard to read (accessibility issue)
❌ Hover states that only work on desktop (no mobile consideration)

### Reference Material

- Full design guide: `/docs/context/design-principles.md`
- Inspiration: Stripe, OpenAI, Linear, Apple, Figma
- Key: These aren't arbitrary aesthetic choices - they're about creating a product that feels premium, trustworthy, and easy to use

## Implementation Phases

The project is broken down into **6 sequential phases**, each with detailed specifications and checklists. Follow the phase documents in order - each phase builds on the previous one.

### Phase Breakdown

**Phase 0: Database Schema Design**
- Finalize MongoDB schema and make key database decisions
- Define all collections, fields, and relationships
- Create indexes and data validation rules
- Duration: Discussion-based (1-2 days to finalize)
- Status: First - Complete before starting Phase 1

**Phase 1: Public Home Page** _(1-2 days)_
- Build "ready to sell" landing page
- Establish design tokens and color palette (must follow design-principles.md)
- Create reusable component library (Button, Card, Section components)
- Implement light/dark mode support
- Make navbar responsive and theme-aware
- Status: Must be visually stunning - represents brand to visitors

**Phase 2: Authentication System** _(2-3 days)_
- Implement JWT-based sign up and sign in
- Create /api/auth/signup, /api/auth/signin, /api/auth/logout, /api/auth/me endpoints
- Add "Remember Me" checkbox (30-day sessions)
- Build auth forms with validation (following Phase 1 design system)
- Integrate navbar with auth state awareness
- Status: Secure, smooth, follows design consistency

**Phase 3: Dashboard Skeleton** _(1-2 days)_
- Build main dashboard layout with 3 tabs: Home, Generate, Gallery
- Implement route protection (redirect non-authenticated users)
- Create tab navigation and content areas
- Add welcome message showing user's first name
- Build home tab with stats cards and recent activity
- Status: Layout only - no backend processing yet

**Phase 4: Dashboard Features & Interactive Components** _(3-4 days)_
- Build FlashcardViewer with flip animation
- Build FlashcardCreator for user-generated cards
- Build QuizInterface with feedback and scoring
- Build TranscriptViewer with search
- Build PrerequisiteChecker with readiness quiz
- Populate Gallery with VideoCard components
- Test all components with mock data
- Status: Beautiful, smooth interactions ready for real data

**Phase 5: Video Processing Pipeline** _(3-4 days)_
- Create unified SDK file at /lib/sdk.ts for LLM/API clients
- Implement transcript extraction from YouTube
- Integrate Groq LLM with structured output (function calling)
- Create POST /api/videos/process endpoint (main pipeline)
- Create supporting endpoints (GET /api/videos/list, DELETE, etc.)
- Connect Generate tab to real processing
- Show processing progress and results
- Status: End-to-end working pipeline - this is where the magic happens

**Phase 6: Clara - Interactive AI Tutor (RAG Implementation)** _(3-4 days)_
- Set up vector database (Pinecone/Weaviate/Milvus)
- Implement RAG (Retrieval-Augmented Generation) for context-aware Q&A
- Create transcript chunking and embedding generation
- Build ChatBot component with conversation UI (Framer Motion animations)
- Create POST /api/chatbot/ask endpoint (context retrieval + LLM response)
- Integrate with prerequisite checker (users can "Learn with AI" for gaps)
- Add Chatbot tab to materials view alongside flashcards/quizzes
- Store conversation history and enable conversation export
- Status: Post-MVP enhancement - personal AI tutor available 24/7
- Key Feature: Answers grounded in video content, no hallucinations (RAG prevents it)

**Total Estimated Time**:
- **MVP (Phases 0-5)**: 11-17 days
- **Full Product (Phases 0-6)**: 14-21 days

See `/docs/phases/` directory for detailed specifications for each phase.
See `/docs/PHASE_TRACKER.md` for tracking progress through all phases.

## Database Schema (MongoDB)

Key collections to implement:
- **Users**: Authentication, profiles, preferences
- **Sessions**: User session management
- **Videos**: Processed video metadata (URL, title, thumbnail, timestamp)
- **LearningMaterials**: Generated flashcards, quizzes, transcripts, prerequisites
- **Progress**: Quiz scores, flashcard mastery, study streaks
- **UserFlashcards**: User-created custom flashcards

## Environment Variables Required

```bash
# Database
MONGODB_URI=               # MongoDB connection string (already configured)

# LLM Integration
GROQ_API_KEY=             # Groq API key for gpt-4o-120b model
GROQ_MODEL=gpt-4o-120b    # Groq model identifier

# Authentication
JWT_SECRET=               # Strong random string for JWT signing (32+ chars)
JWT_EXPIRE_DAYS=1         # Short-lived token expiry (1 day)
JWT_REMEMBER_DAYS=30      # Remember-me token expiry (30 days)

# Webshare Proxy (YouTube Transcript Extraction)
WEBSHARE_PROXY_ENABLED=true    # Enable/disable proxy (set to 'false' for local dev on residential IP)
WEBSHARE_PROXY_USERNAME=       # Webshare username from dashboard
WEBSHARE_PROXY_PASSWORD=       # Webshare password from dashboard
WEBSHARE_PROXY_URL=            # Full proxy URL: http://username:password@p.webshare.io:80

# Admin Portal
ADMIN_PASSWORD=           # Password for admin portal access (use a strong password)

# Application
NODE_ENV=development      # development, production
```

### Webshare Proxy Setup (Critical for Production)

**Purpose:** Routes transcript extraction requests through residential proxies to bypass YouTube's cloud provider IP blocking.

**Setup:**
1. Create Webshare account: https://www.webshare.io
2. Purchase "Residential Proxy" package (NOT "Proxy Server" or "Static Residential")
3. Retrieve credentials from Webshare dashboard → Proxy Settings
4. Add to environment variables as shown above

**Troubleshooting:**
- If transcript extraction fails with "ECONNREFUSED": Check proxy credentials
- If YouTube returns 429 (rate limit): Webshare may be rate-limited, wait and retry
- If extraction still fails in production: Verify residential proxy plan is active
- Test proxy connectivity: `curl https://your-app.vercel.app/api/test/proxy`

**Cost:** Webshare residential proxies start at ~$2.99/month for 1GB bandwidth. Free tier available with limited usage.

**Note**: Transcript API (youtube-transcript) requires NO API key - it's open source, but proxy is needed for production deployment

## Key Technical Decisions (FINALIZED)

1. **LLM Provider**: ✅ Groq (gpt-4o-120b model)
   - Faster than Gemini
   - Better structured output support (function calling)
   - Cost-effective at scale
   - Reference: https://console.groq.com/docs/quickstart and https://console.groq.com/docs/structured-outputs

2. **Transcript API**: ✅ youtube-transcript library
   - Open source, no API key needed
   - Reliable for public YouTube videos
   - Handles captions and auto-generated transcripts
   - Error handling: Falls back gracefully if no transcript available

3. **Authentication**: ✅ Simple JWT (not NextAuth)
   - JWT tokens in HTTP-only secure cookies
   - Remember-me functionality (30-day sessions)
   - No refresh tokens (keep it simple for MVP)
   - Password hashing with bcryptjs

4. **SDK Architecture**: ✅ Unified `/lib/sdk.ts`
   - All LLM and API clients initialized in one place
   - Easy to switch providers later
   - Clean imports: `import { groq } from '@/lib/sdk'`
   - Extensible for future additions

5. **Structured Output**: ✅ JSON schemas for LLM responses
   - Define exact schema in `/lib/structuredOutput.ts`
   - Groq function calling ensures schema compliance
   - Response types: Flashcards, Quizzes, Timestamps, Prerequisites, ChatbotContext
   - Consistent, parseable output guaranteed

6. **Transcript Extraction**: ✅ youtube-transcript-plus v1.1.1
   - **Library**: `youtube-transcript-plus` (npm package already installed)
   - **No API key required** - Uses YouTube's public caption API
   - **Return format**: Array of segments with text, offset (start time), duration, language
   - **Implementation location**: Phase 5 (Video Processing Pipeline)
   - **Usage**: `fetchTranscript('https://youtu.be/VIDEO_ID')`
   - **Error handling**: Handles unavailable videos, disabled transcripts, missing captions
   - **Reference files**:
     - Full transcript output: `/docs/transcript-output.json`
     - Formatted timestamps: `/docs/transcript-timestamps.json`

7. **Clara**: ⏸️ Post-MVP (Phase 5+)
   - Requires RAG with vector database
   - Integrate after core features stable
   - Pre-implement chatbot context in learning materials generation

## Educational Science Foundation

The platform is built on proven learning principles:
- **Active Recall**: Flashcards strengthen memory through retrieval practice
- **Testing Effect**: Quizzes improve long-term knowledge retention
- **Generation Effect**: User-created flashcards enhance learning
- **Spaced Repetition**: Optimal review timing for memory consolidation
- **Interactive Engagement**: Boosts motivation and material retention

## Admin Portal

A password-protected admin portal is available at `/admin` for platform monitoring and management.

**Features**:
- **Analytics Dashboard**: View platform-wide metrics including:
  - Total users, active users, new registrations
  - Content statistics (videos, flashcards, quizzes)
  - Registration timeline charts (week/month/year views)
  - Activity heatmaps showing engagement patterns
  - Activity breakdown by type

- **User Management**:
  - Search and filter users by name, username, or email
  - View detailed user profiles with full activity history
  - See generation counts per user (videos, flashcards, quizzes, etc.)
  - Cascade delete users (removes all associated data)
  - Delete individual generation items

**Security**:
- Password-only authentication using `ADMIN_PASSWORD` environment variable
- JWT-based session management (24-hour tokens)
- Rate limiting: Max 5 failed login attempts per IP in 15 minutes
- Audit logging of all login attempts
- HTTP-only secure cookies

**Access**:
- Login URL: `/admin`
- Dashboard: `/admin/dashboard` (analytics)
- User Management: `/admin/dashboard/users`

**Setup**:
1. Set `ADMIN_PASSWORD` environment variable to a strong password
2. Navigate to `/admin` and enter the password
3. Access admin dashboard and user management features

## Design Philosophy

- **Clean & Minimal**: No clutter, focus on learning
- **Fast & Responsive**: <60s material generation, <2s page loads
- **Encouraging**: Celebrate progress and mastery
- **Organized**: Never lose learning materials
- **Accessible**: Works across all devices
- **Self-Contained**: Keep users in-app (chatbot for prerequisites/clarifications)
- **User Empowerment**: Enable custom flashcard creation

## Important Constraints

- Never reset Supabase DB without user approval (global user preference)
- Focus on undergraduate and graduate level educational content
- Prioritize 4 core features (flashcards, quizzes, timestamps, prerequisites) before advanced capabilities
- User data is sacred - never lose learning materials
- Quality over quantity - better 4 excellent features than 10 mediocre ones

## How to Execute This Project

### Start Here

1. **Read Phase 0**: `/docs/phases/PHASE_0_DATABASE_SCHEMA.md`
   - Answer the 11 database schema questions
   - Lock in your MongoDB decisions
   - This unblocks all other phases

2. **Follow Phases Sequentially**: Each phase builds on the previous
   - Phase 1 → Phase 2 → Phase 3 → Phase 4 → Phase 5
   - Don't skip phases or change order
   - Each phase is 1-4 days of focused work

3. **Track Progress**: `/docs/PHASE_TRACKER.md`
   - Update status as you complete phases
   - Check off deliverables
   - Log any blockers or decisions

4. **Always Reference Design Principles**
   - Before starting Phase 1: Read `/docs/context/design-principles.md`
   - Before every new component: Check design principles
   - Before styling anything: Verify dark mode works

### Quick Phase Reference

| Phase | File | Duration | Key Output |
|-------|------|----------|-----------|
| 0 | `/docs/phases/PHASE_0_DATABASE_SCHEMA.md` | Discussion | Schema decisions |
| 1 | `/docs/phases/PHASE_1_HOME_PAGE.md` | 1-2 days | Design tokens + home page |
| 2 | `/docs/phases/PHASE_2_AUTHENTICATION.md` | 2-3 days | Auth system (sign up/in) |
| 3 | `/docs/phases/PHASE_3_DASHBOARD_SKELETON.md` | 1-2 days | Dashboard layout |
| 4 | `/docs/phases/PHASE_4_DASHBOARD_FEATURES.md` | 3-4 days | Interactive components |
| 5 | `/docs/phases/PHASE_5_VIDEO_PIPELINE.md` | 3-4 days | Full video processing |
| **6** | **`/docs/phases/PHASE_6_QA_CHATBOT.md`** | **3-4 days** | **Clara (RAG)** |
| — | — | — | — |
| **0-5** | **All MVP phases** | **11-17 days** | **Production-ready MVP** |
| **0-6** | **All phases** | **14-21 days** | **Full product with chatbot** |

### Common Tasks During Implementation

**For every new component**:
1. Check Phase X requirements
2. Review design-principles.md
3. Ensure dark mode works
4. Test responsive design
5. Verify accessibility
6. Check animations are <400ms

**For every API endpoint**:
1. Add authentication check
2. Implement error handling
3. Test with valid/invalid input
4. Document in phase doc
5. Verify MongoDB operations

**For every page**:
1. Route protection (auth required)
2. Follow design tokens from Phase 1
3. Light AND dark mode equal quality
4. Mobile responsive
5. Keyboard navigation works

## Reference Documentation

- **Phase Guide**: `/docs/phases/` (all detailed specifications)
- **Progress Tracker**: `/docs/PHASE_TRACKER.md` (track your work)
- **Design Principles**: `/docs/context/design-principles.md` (CRITICAL - follow strictly)
- **Project Plan**: `/docs/PROJECT_PLAN.md` (full vision and context)
- **Changelog**: `CHANGELOG.md` (a log of all notable changes to the project)
- **Groq Docs**: https://console.groq.com/docs/quickstart and https://console.groq.com/docs/structured-outputs
- **Next.js Docs**: https://nextjs.org/docs
- **Tailwind CSS v4**: https://tailwindcss.com/docs
- **Framer Motion**: https://www.framer.com/motion/


## Your Senior Engineering Manager (SEM)

You have access to a Senior Engineering Manager (SEM) for guidance on complex technical decisions, architectural choices, and challenging problems. The SEM is a strategic resource—use intelligently, not for every question.

### How to Consult the SEM

Initiate a consultation using:
```bash
gemini -p "<Your question or concern>"
```

**Key guidelines for effective SEM consultations**:

1. **Provide Context Efficiently**
   - Reference relevant files using `@filename` syntax so the SEM can review them
   - Explicitly state: "SEM, please provide thoughts/suggestions only—no code modifications needed"
   - Include all related questions in a single prompt to avoid context loss (you cannot follow up in one session)
   - Be specific about what you need: architectural advice, trade-offs analysis, validation, etc.

2. **Think Critically About SEM Suggestions**
   - The SEM provides recommendations and perspectives, not final decisions
   - Evaluate suggestions against your project context, constraints, and goals
   - Question suggestions that don't align with your understanding or the CLAUDE.md principles
   - You are the decision-maker—SEM input is advisory only

3. **Report Back to the User**
   - **Before implementing anything the SEM suggests, summarize their key points to the user**
   - Explain your own analysis: What makes sense? What concerns do you have?
   - Share what you've decided and why (even if disagreeing with SEM)
   - Transparency helps build trust in your decision-making

### When to Consult the SEM (Not Every Question!)

**Definitely consult**:
- Stuck in a loop trying to solve a problem (after exhausting obvious approaches)
- Major architectural decisions with trade-offs (e.g., database design, auth strategy)
- Complex feature design with multiple valid approaches
- Performance or scaling concerns
- Integration strategy for new technologies

**Do NOT consult**:
- Straightforward coding tasks or bug fixes
- Questions answerable by reading documentation
- Simple component implementation
- Basic debugging (only escalate if truly stuck)

**Examples**:
- ✅ "Should we use RAG or fine-tuning for the chatbot? I'm seeing trade-offs in X, Y, Z dimensions. What are your thoughts? @PHASE_6_QA_CHATBOT.md @design-principles.md"
- ❌ "How do I import a React component?" (Read docs instead)
- ✅ "I've tried 3 approaches to optimize this query and none work well. Can you review my thinking? @code.ts"
- ❌ "What's the syntax for useState?" (Straightforward—use docs)
