import { createEmptyCard, fsrs, Rating, type Card } from 'ts-fsrs';
import type { IFSRSCard } from '@/lib/models/Flashcard';

const scheduler = fsrs(); // default: 90% target retention

export { Rating };

/** Initialize FSRS state for a new flashcard. */
export function initFSRSCard(dueDate?: Date): IFSRSCard {
  const empty = createEmptyCard(dueDate);
  return {
    due: empty.due,
    stability: empty.stability,
    difficulty: empty.difficulty,
    elapsed_days: empty.elapsed_days,
    scheduled_days: empty.scheduled_days,
    reps: empty.reps,
    lapses: empty.lapses,
    learning_steps: empty.learning_steps,
    state: empty.state,
  };
}

/** Convert a stored FSRS subdocument back to a ts-fsrs Card. */
export function toFSRSCard(fsrsData: IFSRSCard): Card {
  return {
    due: new Date(fsrsData.due),
    stability: fsrsData.stability,
    difficulty: fsrsData.difficulty,
    elapsed_days: fsrsData.elapsed_days,
    scheduled_days: fsrsData.scheduled_days,
    reps: fsrsData.reps,
    lapses: fsrsData.lapses,
    learning_steps: fsrsData.learning_steps,
    state: fsrsData.state,
    last_review: fsrsData.last_review ? new Date(fsrsData.last_review) : undefined,
  };
}

/** Process a review rating and return the updated FSRS card state. */
export function processReview(
  fsrsData: IFSRSCard,
  rating: Rating,
  now = new Date()
): IFSRSCard {
  const card = toFSRSCard(fsrsData);
  const scheduling = scheduler.repeat(card, now);
  const next = scheduling[rating].card;
  return {
    due: next.due,
    stability: next.stability,
    difficulty: next.difficulty,
    elapsed_days: next.elapsed_days,
    scheduled_days: next.scheduled_days,
    reps: next.reps,
    lapses: next.lapses,
    learning_steps: next.learning_steps,
    state: next.state,
    last_review: now,
  };
}

/** Get all 4 scheduled outcomes for display (predicted intervals). */
export function getSchedulingPreview(
  fsrsData: IFSRSCard,
  now = new Date()
): Record<Rating, { due: Date; scheduledDays: number }> {
  const card = toFSRSCard(fsrsData);
  const scheduling = scheduler.repeat(card, now);
  return {
    [Rating.Again]: { due: scheduling[Rating.Again].card.due, scheduledDays: scheduling[Rating.Again].card.scheduled_days },
    [Rating.Hard]:  { due: scheduling[Rating.Hard].card.due,  scheduledDays: scheduling[Rating.Hard].card.scheduled_days },
    [Rating.Good]:  { due: scheduling[Rating.Good].card.due,  scheduledDays: scheduling[Rating.Good].card.scheduled_days },
    [Rating.Easy]:  { due: scheduling[Rating.Easy].card.due,  scheduledDays: scheduling[Rating.Easy].card.scheduled_days },
  };
}

/** Format a due date into a human-readable interval string ("10m", "1d", "8d"). */
export function formatInterval(due: Date, now = new Date()): string {
  const diffMs = due.getTime() - now.getTime();
  if (diffMs <= 0) return 'now';
  const diffMin = Math.round(diffMs / 60_000);
  if (diffMin < 60) return `${diffMin}m`;
  const diffH = Math.round(diffMin / 60);
  if (diffH < 24) return `${diffH}h`;
  return `${Math.round(diffH / 24)}d`;
}
