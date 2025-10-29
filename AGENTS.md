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
