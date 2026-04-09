import Flashcard from '@/lib/models/Flashcard';
import { initFSRSCard } from './fsrs';

/**
 * Lazy migration: initializes FSRS state for any flashcards that don't have it yet.
 * Safe to call on every request — becomes a no-op after all cards are migrated.
 */
export async function ensureFSRSInitialized(userId: string): Promise<void> {
  const uninitCards = await Flashcard.find(
    { userId, fsrs: { $exists: false } },
    { _id: 1, createdAt: 1 }
  ).lean();

  if (uninitCards.length === 0) return;

  const bulkOps = uninitCards.map((card) => ({
    updateOne: {
      filter: { _id: card._id },
      update: { $set: { fsrs: initFSRSCard(card.createdAt as Date) } },
    },
  }));

  await Flashcard.bulkWrite(bulkOps);
}
