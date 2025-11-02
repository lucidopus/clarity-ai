# Repository Guidelines

## Project Structure & Module Organization
The Next.js application lives in `app/`, with `layout.tsx` defining shared chrome, `page.tsx` for the landing experience, and `globals.css` for Tailwind-backed global styles. Static assets belong in `public/`. Shared planning notes and research live under `docs/`. Configuration files (`next.config.ts`, `eslint.config.mjs`, `tailwind.config` via PostCSS) sit at the repository root; keep new cross-cutting utilities nearby for visibility.

## Build, Test, and Development Commands
Run `npm install` once to pull dependencies. Use `npm run dev` for the local development server with hot reload. Ship-ready bundles come from `npm run build`, and `npm run start` serves that build for smoke tests. Lint with `npm run lint`; fix issues early and prefer `npx eslint . --fix` before opening a PR.

## Coding Style & Naming Conventions
Write TypeScript-first React components using 2-space indentation and named exports. Components live in PascalCase files (e.g., `VideoSummaryCard.tsx`), hooks in camelCase prefixed with `use`, and utility modules end in `.utils.ts`. Favor functional components, React Server Components where possible, and keep JSX lean—extract helpers when rendering grows beyond ~20 lines. Tailwind classes belong inline; add custom tokens to `globals.css` sparingly. Always resolve lint warnings before commit.

## Testing Guidelines
Automated tests are not yet established; introduce them alongside new features. Prefer component tests with React Testing Library and Vitest (placed in `app/__tests__/` or co-located as `.test.tsx`). For API routes, add integration coverage that exercises the Next.js runtime via `@testing-library/jest-dom`. Document manual QA steps in the PR description until the test suite solidifies.

## Commit & Pull Request Guidelines
Follow Conventional Commits (`feat:`, `fix:`, `chore:`) so the changelog stays readable. Scope commits to one intent and keep messages under 72 characters. Every PR should describe the change, reference related issues, list testing performed (`npm run dev`, `npm run lint`, upcoming tests), and include screenshots or recordings for UI adjustments. Request review early when architectural choices need alignment; convert to ready-for-review only after addressing blockers.

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
