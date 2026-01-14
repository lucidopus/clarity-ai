# Repository Guidelines

## Project Structure & Module Organization
The Next.js application lives in `app/`, with `layout.tsx` defining shared chrome, `page.tsx` for the landing experience, and `globals.css` for Tailwind-backed global styles. Static assets belong in `public/`. Shared planning notes and research live under `docs/`. Configuration files (`next.config.ts`, `eslint.config.mjs`, `tailwind.config` via PostCSS) sit at the repository root; keep new cross-cutting utilities nearby for visibility.

## Build, Test, and Development Commands
Run `yarn install` once to pull dependencies. Use `yarn dev` for the local development server with hot reload. Ship-ready bundles come from `yarn build`, and `yarn start` serves that build for smoke tests. Lint with `yarn lint`; fix issues early and prefer `npx eslint . --fix` before opening a PR.

## Coding Style & Naming Conventions
Write TypeScript-first React components using 2-space indentation and named exports. Components live in PascalCase files (e.g., `VideoSummaryCard.tsx`), hooks in camelCase prefixed with `use`, and utility modules end in `.utils.ts`. Favor functional components, React Server Components where possible, and keep JSX lean—extract helpers when rendering grows beyond ~20 lines. Tailwind classes belong inline; add custom tokens to `globals.css` sparingly. Always resolve lint warnings before commit.

## Testing Guidelines
Automated tests are not yet established; introduce them alongside new features. Prefer component tests with React Testing Library and Vitest (placed in `app/__tests__/` or co-located as `.test.tsx`). For API routes, add integration coverage that exercises the Next.js runtime via `@testing-library/jest-dom`. Document manual QA steps in the PR description until the test suite solidifies.

## Commit & Pull Request Guidelines
Follow Conventional Commits (`feat:`, `fix:`, `chore:`) so the changelog stays readable. Scope commits to one intent and keep messages under 72 characters. Every PR should describe the change, reference related issues, list testing performed (`npm run dev`, `npm run lint`, upcoming tests), and include screenshots or recordings for UI adjustments. Request review early when architectural choices need alignment; convert to ready-for-review only after addressing blockers.

## Changelog Guidelines

This project follows the [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) format. The `CHANGELOG.md` file is a manually-updated log of notable changes for each version.

- **Conventional Commits**: All commit messages must follow the [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/) specification. This helps in automatically generating changelogs in the future.
- **Update the `CHANGELOG.md`**: For any user-facing change (`feat`, `fix`, `perf`), add a corresponding entry to the `## [Unreleased]` section of the `CHANGELOG.md` file.
- **Categorize Changes**: Group changes under the following headings: `Added`, `Changed`, `Deprecated`, `Removed`, `Fixed`, `Security`.

## Configuration & Secrets
Store API keys (Gemini, Groq, MongoDB) in `.env.local`, never in source control. Add new required variables to the README and provide sane fallbacks in code. When testing third-party integrations, gate calls behind environment checks so `npm run dev` works without credentials.


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