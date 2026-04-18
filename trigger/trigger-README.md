# Trigger.dev Background Tasks

This directory contains Trigger.dev v4 tasks for long-running, resilient background processing.

## Files

### `process-single-video.ts`
**Task ID:** `process-single-video`

Processes a single failed video. Triggered by the coordinator task (`retry-failed-videos`).
- **Queue:** `video-retry-queue` (concurrency: 3)
- **Max Duration:** 10 minutes
- **Logic:**
  - Permanent errors → mark video as `failed`
  - Token limit errors → use chunked generation
  - Transient errors → standard retry

### `recommendations.ts`
**Task IDs:** `schedule-recommendation-updates`, `generate-user-recommendations`

Generates personalized video recommendations for users.
- **`scheduleRecommendationUpdates`:** Scheduled task (every 6 hours). Fetches all users with embeddings and triggers `generateUserRecommendations` for each.
- **`generateUserRecommendations`:** Worker task. Performs vector search on videos and caches results to Redis (TTL: 24 hours).

### `retry-failed-videos.ts`
**Task ID:** `retry-failed-videos`

Coordinator scheduled task for retrying failed videos.
- **Schedule:** Every 6 hours (configured in dashboard)
- **Max Duration:** 10 minutes
- **Logic:**
  - Finds videos with `completed_with_warning` status
  - Marks permanent failures as `failed`
  - Batch triggers `processSingleVideoTask` for retries

### `send-study-reminder.ts`
**Task ID:** `sweep-study-reminders`

Sends study window reminder emails exactly 15 minutes before each user's window opens.
- **Schedule:** Every minute (UTC cron `* * * * *`)
- **Logic:**
  - Bucketed-sweeper pattern (the same shape Google Calendar / Duolingo use for reminders)
  - Queries `{ nextReminderAt: { $lte: now + 60s } }` on an indexed field — O(due users), not O(all users)
  - Atomically claims each due user via `findOneAndUpdate` (prevents double-send on concurrent runs)
  - Sends the email, then advances `nextReminderAt` to the next local-day fire time (DST-safe because it's recomputed each cycle via `computeNextReminderAt`)
  - `nextReminderAt` is set on contract save in `app/api/streak-contract/route.ts` and cleared on contract delete
  - Respects `preferences.general.studyReminders` opt-out

## Development Rules

See [docs/dev_rules/trigger_rules.md](docs/dev_rules/trigger_rules.md) for:
- Trigger.dev v4 API patterns
- Database access conventions
- Error handling best practices
- Configuration guidelines

## Quick Reference

```typescript
// Import pattern (v4)
import { task, logger } from "@trigger.dev/sdk";

// Task definition
export const myTask = task({
  id: "my-task",
  run: async (payload) => {
    logger.info("Processing", { payload });
    return { success: true };
  },
});
```
