# hooks/ — Custom React Hooks

Custom React hooks used across the Clarity AI frontend.

| Hook | File | Description |
|------|------|-------------|
| `useActivityTracker` | `useActivityTracker.ts` | Tracks user inactivity with a debounced timeout; fires a callback when the user goes idle vs. resumes activity. Includes unit tests in `useActivityTracker.test.ts`. |
| `useChatBot` | `useChatBot.ts` | Manages chatbot state: message history, send/receive, loading indicators, and channel routing (chatbot vs. AI guide). |
| `useDashboardInsights` | `useDashboardInsights.tsx` | React context + hook that fetches and caches all dashboard analytics data (focus hours, weekday consistency, video engagement, activity funnel). |
