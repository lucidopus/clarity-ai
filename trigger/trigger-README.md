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

### `remind-study-contract.ts`
**Task ID:** `remind-study-contract`

Sends pre-window study reminders to users with a Cognitive Contract set.
- **Schedule:** Every 15 minutes (UTC cron)
- **Logic:**
  - Scans users with `studyContract` set and study reminders enabled
  - Sends a supportive nudge ~15 minutes before the local window opens
  - Deduplicates per local-calendar-day via `studyContractLastRemindedAt`

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
