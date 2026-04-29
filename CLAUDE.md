# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Clarity AI is an AI-powered educational platform that turns passive content consumption into active, personalized learning. Users submit content from **6 source types** (YouTube, document, audio, text, live lecture, media) and the platform generates a full suite of study materials (flashcards, quizzes, mind maps, notes, chapters, prerequisites, case studies, summary) plus an in-context AI tutor (Clara). Multiple sources can be combined into a single generation request.

The full feature surface is documented in `README.md`. CLAUDE.md is for repo-internal context.

## Development Commands

```bash
yarn dev          # Next.js dev server (http://localhost:3000)
yarn build        # Production build
yarn start        # Production server
yarn lint         # ESLint (eslint-config-next, flat config in eslint.config.mjs)
yarn test         # Jest (ts-jest preset, node env, @/ path mapping configured)

# Run a single test file
yarn test lib/transcript.test.ts

# Run tests matching a name pattern
yarn test -t "fsrs scheduling"
```

Tests live next to the code they cover (`*.test.ts`) — primarily under `lib/` and `hooks/`. There is no end-to-end test suite; UI work is verified manually in the browser per the constraints below.

## Architecture

This is a Next.js 16 App Router application backed by MongoDB (Mongoose), Redis (caching), Supabase Storage (file uploads), and Trigger.dev (background jobs).

### Multi-source generation pipeline

The whole product is built around one pipeline shape:

```
Source(s) → Extractor (factory) → Content Validation → Trigger.dev task
         → LLM Generation (Groq + Gemini, structured outputs)
         → Mongoose persistence + Gemini embeddings → Vector search
```

- **Extractor factory** — `lib/extractors/index.ts` exports `getExtractor(sourceType)` returning one of `youtube | document | audio | media | text | live_lecture`. All extractors implement `ExtractorFunction` from `lib/extractors/types.ts`. Add a new source by writing an extractor file and registering it in the factory map.
- **Source storage** — Uploaded files (PDF/PPTX/audio) go to **Supabase Storage**; the public URL is saved on the Mongoose `Source` doc (see `lib/models/Source.ts`). Plain text doesn't go to Storage.
- **Background pipeline** — `trigger/process-video-pipeline.ts` is the main generation task; `trigger/process-single-video.ts` is the per-video retry worker (queue `video-retry-queue`, concurrency 3, max 10min). `trigger/retry-failed-videos.ts` runs every 6h to sweep `completed_with_warning` rows. `trigger/recommendations.ts` runs every 6h to refresh per-user vector-search recommendations into Redis (24h TTL).
- **LLM orchestration** — `lib/llm.ts` calls models via LangChain wrappers initialized in `lib/sdk.ts` (`geminiLlm`, `chatbotLlm`, `groqLlm` are lazy `Proxy` objects so import-time has no side effects). Models are env-driven: `CONTENT_GENERATION_MODEL` (Gemini, generation), `CHATBOT_MODEL` (Groq, fallback), `CLARA_MODEL` (Gemini Flash, Clara tool-calling).
- **Structured outputs** — All LLM response schemas are defined as Zod + JSON-Schema in `lib/structuredOutput.ts`; chunked/sequential variants in `lib/structuredOutputPartial.ts` for token-limit cases. Always reuse these schemas instead of redefining.
- **Helpers** — `lib/pipeline-helpers.ts` and `lib/video-retry-processing.ts` hold pipeline glue (validation, error classification, chunked-generation routing). Read these before adding logic to a `trigger/` task.

### Live lecture (real-time capture)

Distinct architecture from the async pipeline; finalized as a 3-layer storage chain:

`React state → IndexedDB (`lib/live-lecture/indexeddb.ts`) → MongoDB every 10s (no Redis for the transcript stream)`.

- Transcription: ElevenLabs Scribe V2 streaming via `lib/live-lecture/use-live-transcription.ts`.
- UX: Granola-style — **no visible transcript during the lecture**, only a floating Clara bubble + focus notes + importance markers. The transcript is shown after the session ends.
- Crash recovery: `lib/live-lecture/use-crash-recovery.ts` rehydrates from IndexedDB if the tab is closed mid-lecture.
- Schema: `lib/models/LiveSession.ts`. Post-lecture, the transcript runs through the same generation pipeline as any other source.

### Clara (AI tutor)

- LangChain agent with tool calling. Tools are defined under `lib/tools/` and bound in the chatbot endpoint (`lookup_study_materials`, `set_study_contract`, `search_transcript`).
- Visualizations are inline code-fence languages, not tools — Clara writes ` ```mermaid ` (diagrams), ` ```callout ` (info / insight / warn JSON), or ` ```compare ` (two-column JSON), and `components/ChatMessage.tsx` maps them to the components in `components/chat/`. KaTeX math (`$x$` / `$$x$$`) is auto-rendered via `remark-math` + `rehype-katex`. Schemas + parse helpers live in `lib/types/visualization.ts`.
- Conversation persistence: `lib/chat-db.ts`. System-prompt context (user profile + per-source materials) is assembled by `lib/chatbot-context.ts`.
- Endpoint: `app/api/chatbot/ask`. Greeting/Feynman flows are in `lib/services/claraGreeting.ts`.

### Discovery & recommendations

- Embeddings: Google Gemini `text-embedding-004` (1536-dim) via `lib/embedding.ts`.
- Vector search: MongoDB Atlas vector index on `Video` and on user preference embeddings.
- Category routing: `lib/services/category-selector.ts` chooses sections (For You / Quick Wins / Deep Dives / etc.).
- Cache: `lib/cache.ts` wraps Redis with **transparent DB fallback** — every cached read silently falls back to the source on any Redis error. Use `getCached(key, fallback, ttl)` and the `CacheKeys` factory; invalidation helpers are exported (`invalidateReadiness`, `invalidateUserInsights`, etc.).

### FSRS spaced repetition

Flashcard scheduling uses [`ts-fsrs`](https://github.com/open-spaced-repetition/ts-fsrs) — see `lib/services/fsrs.ts` and `lib/services/fsrs-migrate.ts`. Reviews persist to `FlashcardReview` (history) and update `Flashcard` (next-due state). When touching scheduling, do not invent a custom algorithm — go through these services.

### Cost tracking

Every LLM/embedding/transcription call should be logged via `lib/cost/logger.ts`. Pricing config is in `lib/cost/config.ts` (model keys here must match `CONTENT_GENERATION_MODEL` / `CHATBOT_MODEL` env values). Calculations: `lib/cost/calculator.ts`. Surfaced in the admin portal under Cost Tracking. See `docs/cost-tracking.md`.

### Auth

Custom JWT in HTTP-only cookies (no NextAuth), with email OTP verification via SendGrid (`lib/email.ts`, `lib/otp.ts`). Endpoints under `app/api/auth/` cover signin / signup / verify-email / resend-verification / forgot-password / reset-password / change-password / callback. Server utilities in `lib/auth.ts`; client context in `lib/auth-context.tsx`. Admin portal uses a separate password (`ADMIN_PASSWORD`) and JWT (`lib/adminAuth.ts`); login is rate-limited (5 / 15min).

### Rate limiting & limits

- All tunable limits live in **one** file: `lib/limits.ts` (includes `UNLIMITED_MODE` switch). Don't scatter magic numbers — add or adjust them here.
- The limiter itself is MongoDB-backed (atomic, TTL-based) in `lib/rate-limit.ts`. There's also `rate-limit-auth.ts` for the auth flow.

### Mongoose models

All collections are defined in `lib/models/` and re-exported from `lib/models/index.ts`. Notable ones beyond the obvious: `Source` + `SourceContent` (multi-source upload separation), `Cost` (per-call API cost log), `Alert` / `SystemLog` (admin observability), `LiveSession`, `MindMap`, `Note`, `Solution` (case-study attempts), `DailyChallenge`, `TodaysMix`, `StudyDay`, `FlashcardReview`, `VerificationToken`, `ActivityLog`. Always extend the Mongoose model rather than defining a parallel TypeScript-only shape.

### Webshare proxy (production transcripts)

YouTube transcript extraction goes through Webshare residential proxies in production (cloud IPs are blocked by YouTube). Configured via `WEBSHARE_PROXY_*` env vars (see README). Locally on a residential IP, set `WEBSHARE_PROXY_ENABLED=false`. If extraction fails with `ECONNREFUSED` or 429, check the proxy plan / credentials before assuming a code bug.

## Path alias

`@/*` maps to the repo root (see `tsconfig.json`). Jest is configured the same way (`jest.config.js` `moduleNameMapper`). Always import via `@/lib/...`, `@/components/...`, etc.

## Folder-level READMEs

Several folders carry a `<folder>-README.md` (e.g., `lib/lib-README.md`, `components/components-README.md`, `app/api/api-README.md`, `trigger/trigger-README.md`, `hooks/hooks-README.md`). Read these before exploring a directory — they're hand-maintained indices of what's in each file. Keep them current when you add or rename files in those folders. Do **not** add READMEs to every folder — only the key ones.

## Standing dev rules

Two repo-specific rule docs that take precedence over generic guidance:

- `docs/dev_rules/trigger_rules.md` — Trigger.dev v4 only (no `@trigger.dev/sdk/v3`), every task must be exported, use the `logger`, schema validation via `schemaTask`, etc. Read before writing or editing anything in `trigger/`.
- `docs/dev_rules/ui_rules.md` — UI conventions; pair with the design principles below.

## Design Principles - CRITICAL

**All work must strictly adhere to `docs/context/design-principles.md`.**

This is NOT optional. Every component, page, and interaction must follow these principles:

### Key Design Principles

**Modern Minimalist Aesthetic**
- Clean, clutter-free layouts inspired by Linear, Stripe, Apple
- Ample whitespace; clear visual hierarchy; every element serves a purpose
- Generous negative space for a premium, elegant feel

**Vibrant & Cohesive Color Palette**
- Neutral base (whites/light grays in light mode; deep charcoals in dark mode), single vibrant accent (cyan/purple/teal) used sparingly for CTAs, active states, highlights
- Consistent palette throughout — no chaotic colors
- High contrast text: WCAG 4.5:1 or better in **both** themes

**Clean Typography & Iconography**
- Geist Sans (already configured via `next/font/google`)
- Clear type scale; consistent sizes/weights across similar elements
- Simple, geometric line icons (lucide-react); accent color only for active states

**Smooth & Purposeful Animations**
- Subtle micro-interactions only (200–300ms, ease-out)
- Every animation must serve a UX purpose; no laggy or interrupting motion
- Examples: flashcard 3D flip (300ms), button hover lift, fade/slide tab transitions

**Plain, Human UI Copy**
- Every label, tooltip, empty state, error message, score description, and onboarding line must be written in language a real user can read once and understand
- Do not surface internal terminology, model names, schema field names, raw error codes, file paths, debug strings, or implementation details to the user — translate them into the meaning the user actually cares about
- Don't over-correct into baby-talk either; the bar is "an educated person outside this codebase reads it and immediately knows what it means and what to do next"
- Be concrete and specific over clever or abstract; prefer the verb the user would use ("Generate", "Review", "Skip") over framework or product-internal verbs
- When in doubt, read the copy out loud — if it sounds like a developer wrote it for another developer, rewrite it

**Light & Dark Mode (Dual Theme)**
- Both themes must look equally polished — not a color inversion
- Use deep grays/soft blacks (not pure #000); light gray/off-white text on dark
- Test extensively — switch theme on every screen

**Consistency & Accessibility**
- Unified component design system (same radius, font, spacing across variants)
- Responsive (mobile, tablet, desktop); keyboard navigable; visible focus states
- Never rely on color alone to convey state — pair with icon/label
- Allow font scaling without breaking layout
- Every interactive element (buttons, links, tabs, toggles, custom clickable cards/rows) must use `cursor-pointer` so the affordance is obvious on hover

### Accessibility (WCAG 2.1 AA Minimum)

Contrast ≥ 4.5:1 for body text · visible focus on all interactive elements · semantic HTML · keyboard reachable · screen-reader labels · 44px+ touch targets · color is never the only signal.

### Red Flags (Don't Do This)

❌ Excessive bright color (chaotic, not premium) · long/laggy animations · inconsistent button styles across pages · color-only error states · dark mode treated as an afterthought · cluttered layouts · tiny unreadable text · hover-only interactions with no mobile equivalent.

## Important Constraints

- **Never reset Supabase DB without user approval** (global user preference).
- **User data is sacred** — never lose learning materials.
- **Engineer the backend deliberately**: Before writing new backend code, look for what already exists and reuse it. Hardcoded strings, magic numbers, and constants that appear in more than one place must live in a single shared module and be imported — never duplicated. Class instantiations, external clients, SDK setup, and connection objects must be centralized in one well-known initializer file rather than scattered across call sites — this keeps debugging, swapping providers, and reasoning about lifecycle straightforward. When you're about to add a new util, model, schema, prompt, or helper, first scan for an existing one to extend; only create a new artifact when nothing reasonable fits. Match new file structure to the conventions already established in neighboring code. The bar is: a future reader (or future you) should be able to grep one place to change a value, swap a dependency, or trace a behavior end-to-end.
- **Think Just Right — Do NOT Overengineer**: Match the solution's complexity to the problem.
  - **Simple tasks** (bug fixes, small tweaks): write the most direct solution. No abstractions, no "future-proofing."
  - **Medium tasks** (new features, multi-file changes): reasonable structure, but don't build frameworks for one use case.
  - **Complex tasks** (architectural changes, new systems): plan thoughtfully, use proper abstractions, design for maintainability.
  - **Litmus test**: "If this task's requirements never change, would I still build it this way?" If you're building for hypothetical futures, you're over-engineering.
- **Pre-commit UX Gate (MANDATORY for frontend changes)**: Before `git commit` on any change touching `.tsx`, `.jsx`, `.css`, `components/`, or `app/`, spawn the `ux-reviewer` agent **in background** so other work (lint, build, reading) can proceed in parallel. Wait for the background completion notification, then **only proceed with the commit when it returns all-green**. If it flags issues, fix them and re-spawn the agent in background — do not commit through yellow/red. Skip this gate only for pure backend changes (no frontend files in the diff) or when the user explicitly says "skip UX review."
- **Trigger.dev re-deploy on commit (MANDATORY for `trigger/` changes)**: Any commit that adds, updates, or deletes anything in `trigger/` (new tasks, edits to existing tasks, schedule changes, payload/schema changes, or anything the trigger worker loads) **must be followed by a re-deploy of Trigger.dev tasks** once all other commit gates have passed. Staging/Production only run the **latest deployment**, so skipping this means the commit ships code that the workers will never execute. Treat the re-deploy as part of the commit workflow — not a later TODO. Skip only for pure non-`trigger/` changes, or when the user explicitly says "skip trigger deploy."
- **Ideation: Always Contribute Your Own Ideas**: When the user asks for design suggestions or approaches — even informally ("what do you think?", "give me some options") — always include **your own proposals** alongside anything from the codebase or Gemini. Be opinionated: rank them, flag the one you'd pick, and say why in one line. If you only have one idea, say so explicitly rather than padding.
- **Debug logging discipline**: Don't sprinkle log statements while coding. When you're about to **test** a flow, add temporary debug logs at the meaningful boundaries (entry/exit of a function, pipeline stage transitions, decision branches, external-call success/failure) so the first failed run already tells you where it broke — this avoids round-tripping through the user. Strip these debug logs before committing. A few intentional, low-frequency logs at high-value points (pipeline starts, error paths, cost/usage summaries) are fine to keep in production; what's not fine is per-click or per-render chatter that drowns the logs once the feature is live. Default stance: log when testing, remove before commit, keep only the handful that genuinely earn their place.
- **Always run `yarn lint`** and fix all errors/warnings after a feature update before considering it done. For non-trivial diffs, also run `yarn build` once before committing — but not after every small change.
- **Completion Summary**: Whenever you finish coding, give a quick 3–4 line summary of what you did with a one-line summary of what changed in each file (including file paths).
- **No Co-Authored-By line in commits** for Claude.
- **UI/UX design proposals as `.html` mockup files**, not ASCII/text diagrams.

## Educational Science Foundation

The platform is built on proven learning principles:
- **Active Recall** (flashcards) · **Testing Effect** (quizzes) · **Generation Effect** (user-created cards) · **Spaced Repetition** (FSRS) · **Interactive Engagement** (Clara, mind maps, case studies)

When designing any new study feature, default to one of these — invent only when none fit.

## Admin Portal

Password-protected at `/admin` (`ADMIN_PASSWORD` env var, separate from user auth):

- **Analytics**: total/active users, registrations, content stats, registration timeline, activity heatmap, engagement breakdown.
- **Cost Tracking**: per-model, per-service, per-user API spend; token-usage trends; spending heatmap.
- **User Management**: search/filter users; per-user activity; cascade-delete users and their data.
- **Security**: rate-limited login (5 / 15min); JWT sessions (24h); audit logging; HTTP-only cookies.

Routes: `/admin` (login) · `/admin/dashboard` (analytics) · `/admin/dashboard/users` (user management).

## Reference Documentation

- `README.md` — Public-facing feature & setup overview (the source of truth for the env-var list).
- `CHANGELOG.md` — Notable changes log.
- `docs/context/design-principles.md` — Full design guide (CRITICAL — follow strictly).
- `docs/cost-tracking.md`, `docs/cost-tracking-quick-reference.md` — Cost system internals.
- `docs/dev_rules/trigger_rules.md` — Trigger.dev v4 conventions (mandatory for `trigger/`).
- `docs/dev_rules/ui_rules.md` — UI conventions.
- `docs/PROJECT_PLAN.md`, `docs/PHASE_TRACKER.md`, `docs/phases/` — Historical planning docs (the project is well past these; useful only for archaeology).
- External: [Next.js](https://nextjs.org/docs) · [Tailwind v4](https://tailwindcss.com/docs) · [Framer Motion](https://www.framer.com/motion/) · [Trigger.dev v4](https://trigger.dev/docs) · [Groq](https://console.groq.com/docs/quickstart) · [Gemini](https://ai.google.dev/) · [ts-fsrs](https://github.com/open-spaced-repetition/ts-fsrs).

## Your Senior Engineering Manager (SEM) — Gemini

Think of Gemini as a **senior software engineer on loan from Google** — strong peer, not the decision-maker. Use it as a **different brain** for code review, ideation, sanity-checking a chunk of logic, fact-checking a library/API claim, or unblocking yourself when you're stuck after a couple of real attempts. It's almost always get your plans reviewed by Gemini.

**Important boundary: Gemini is not for the big calls.** If a decision is genuinely high-stakes or architecturally load-bearing (new systems, auth/security flows, data model changes, pipeline restructuring, irreversible migrations, anything that would cost real rework if wrong) — **bring it to me (the user), not to Gemini**. Gemini is for the peer-review-sized stuff in between "I can obviously do this" and "I need the user's call."

**Auto-consult Gemini when**:
- You've written a non-trivial diff and want a second-opinion code review before presenting it.
- You're stuck — you've tried at least a couple of approaches and none cleanly solve it, or you keep circling the same frame.
- You're about to state something as fact about an external library/API/model behavior and you're not ~95% sure (Trigger.dev v4 semantics, Mongoose edge cases, Atlas vector search, FSRS math, LLM quirks).
- You want to widen the frame on ideation — user asked for options, or you only see one approach and suspect there are more.
- You need a focused expert perspective: security review on an auth/token/secret path, performance review on a hot query, accessibility review on a tricky component, etc.

**Do not consult Gemini for**: trivial edits, renames, obvious bug fixes, copy tweaks, simple component work, anything answerable by reading one file, or anything you already have high confidence on. The cost is latency and context-switching — only pay it when a peer review would change the outcome.

**Role-play Gemini into the right expert for the job.** Open the prompt by casting it into a specific role so the lens is sharp:

- Code review → *"Act as a staff engineer doing a code review."*
- Security check → *"Act as a cybersecurity expert reviewing for auth, secret-handling, and injection risks."*
- Performance → *"Act as a performance engineer reviewing this hot path for unnecessary work and scaling issues."*
- API / library correctness → *"Act as someone who ships production code against the Trigger.dev v4 SDK every day."*
- Ideation → *"Act as a product-minded senior engineer brainstorming approaches."*
- Accessibility → *"Act as an accessibility specialist reviewing against WCAG 2.1 AA."*

Match the role to the actual risk you're de-risking. A generic "review this" gets a generic answer.

### How to Consult Gemini

```bash
gemini -p "<Your prompt>"
```

**This is a ONE-SHOT execution.** Gemini cannot see your conversation or follow up with you. It **already knows this codebase** — don't waste tokens re-explaining what Clarity AI is, what the pipeline does, or what Trigger.dev is. Get straight to the point.

**A good Gemini prompt has four parts, in order**:
1. **Role** — one line casting it into the specific expert for this task (see role list above).
2. **What you're doing** — one or two lines on the specific change/decision (not the whole app). Reference files with `@path/to/file.ts` so it reads them directly.
3. **The ask** — a single sharp question or a short numbered list. "Review X for Y," "list trade-offs between A and B," "fact-check my claim that Z," "what am I missing?"
4. **Output shape** — "punch list," "under 200 words," "just recommendations, no code," "rank the options and pick one."

Bundle related questions into one prompt — you can't follow up. If you need three things reviewed, ask all three in the same call.

**Gemini is advisory. You decide.**
- Treat its output as input to your judgment, not a verdict. Push back when it's wrong for this repo's context.
- **Always summarize Gemini's key points back to me before acting on them** — what you agree with, what you reject, and why. Then decide.

**Examples of a well-shaped prompt**:
- ✅ `gemini -p "Act as a staff engineer code reviewer. I'm refactoring the retry path in @trigger/process-single-video.ts to use exponential backoff. Review the diff below for correctness, edge cases, and Trigger.dev v4 idiom. Output: punch list, under 200 words. <paste diff>"`
- ✅ `gemini -p "Act as a cybersecurity expert. Review @app/api/auth/signup/route.ts and @lib/otp.ts for token-handling, rate-limit bypass, and enumeration risks. Output: ranked list of real risks only — skip nits."`
- ❌ `gemini -p "Can you look at my code?"` (no role, no ask, no output shape)


<!-- TRIGGER.DEV scheduled-tasks START -->
# Scheduled tasks (cron)

Recurring tasks using cron. For one-off future runs, use the **delay** option.

## Define a scheduled task

```ts
import { schedules } from "@trigger.dev/sdk";

export const task = schedules.task({
  id: "first-scheduled-task",
  run: async (payload) => {
    payload.timestamp; // Date (scheduled time, UTC)
    payload.lastTimestamp; // Date | undefined
    payload.timezone; // IANA, e.g. "America/New_York" (default "UTC")
    payload.scheduleId; // string
    payload.externalId; // string | undefined
    payload.upcoming; // Date[]

    payload.timestamp.toLocaleString("en-US", { timeZone: payload.timezone });
  },
});
```

> Scheduled tasks need at least one schedule attached to run.

## Attach schedules

**Declarative (sync on dev/deploy):**

```ts
schedules.task({
  id: "every-2h",
  cron: "0 */2 * * *", // UTC
  run: async () => {},
});

schedules.task({
  id: "tokyo-5am",
  cron: { pattern: "0 5 * * *", timezone: "Asia/Tokyo", environments: ["PRODUCTION", "STAGING"] },
  run: async () => {},
});
```

**Imperative (SDK or dashboard):**

```ts
await schedules.create({
  task: task.id,
  cron: "0 0 * * *",
  timezone: "America/New_York", // DST-aware
  externalId: "user_123",
  deduplicationKey: "user_123-daily", // updates if reused
});
```

### Dynamic / multi-tenant example

```ts
// /trigger/reminder.ts
export const reminderTask = schedules.task({
  id: "todo-reminder",
  run: async (p) => {
    if (!p.externalId) throw new Error("externalId is required");
    const user = await db.getUser(p.externalId);
    await sendReminderEmail(user);
  },
});
```

```ts
// app/reminders/route.ts
export async function POST(req: Request) {
  const data = await req.json();
  return Response.json(
    await schedules.create({
      task: reminderTask.id,
      cron: "0 8 * * *",
      timezone: data.timezone,
      externalId: data.userId,
      deduplicationKey: `${data.userId}-reminder`,
    })
  );
}
```

## Cron syntax (no seconds)

```
* * * * *
| | | | └ day of week (0–7 or 1L–7L; 0/7=Sun; L=last)
| | | └── month (1–12)
| | └──── day of month (1–31 or L)
| └────── hour (0–23)
└──────── minute (0–59)
```

## When schedules won't trigger

- **Dev:** only when the dev CLI is running.
- **Staging/Production:** only for tasks in the **latest deployment**.

## SDK management (quick refs)

```ts
await schedules.retrieve(id);
await schedules.list();
await schedules.update(id, { cron: "0 0 1 * *", externalId: "ext", deduplicationKey: "key" });
await schedules.deactivate(id);
await schedules.activate(id);
await schedules.del(id);
await schedules.timezones(); // list of IANA timezones
```

## Dashboard

Create/attach schedules visually (Task, Cron pattern, Timezone, Optional: External ID, Dedup key, Environments). Test scheduled tasks from the **Test** page.

<!-- TRIGGER.DEV scheduled-tasks END -->
