import 'server-only';

import User from '@/lib/models/User';

/**
 * Atomically promotes a due pending contract to active and clears it. Also
 * clears `todayExtensions` (fresh window = fresh extension counter). No-op
 * when no pending edit is due. Safe to call concurrently — MongoDB filters
 * to only one match.
 *
 * Uses an aggregation-pipeline update so we can reference the existing
 * `$studyContract.pending.*` fields. This avoids the read-modify-write race
 * that plagued an earlier draft under concurrent activity writes.
 *
 * Split out from `studyContract.ts` so the pure helpers there stay
 * client-safe. Client components must not import this file — the
 * `server-only` guard will fail the build if they try.
 */
export async function resolvePendingContract(userId: string): Promise<boolean> {
  const now = new Date();
  const result = await User.updateOne(
    {
      _id: userId,
      'studyContract.pending.effectiveAt': { $lte: now },
    },
    [
      {
        $set: {
          'studyContract.windowStart': '$studyContract.pending.windowStart',
          'studyContract.windowEnd': '$studyContract.pending.windowEnd',
          'studyContract.timezone': '$studyContract.pending.timezone',
          // `contractedAt` is "when this window became the active commitment,"
          // not "when the user queued the edit" — use the activation instant.
          'studyContract.contractedAt': '$$NOW',
          'studyContract.pending': null,
          'studyContract.todayExtensions': null,
        },
      },
    ],
  );
  return result.modifiedCount > 0;
}
