import dbConnect from '@/lib/mongodb';
import Progress from '@/lib/models/Progress';
import SourceContent from '@/lib/models/SourceContent';
import Video from '@/lib/models/Video';
import Source from '@/lib/models/Source';
import type { Types } from 'mongoose';

export type PageConfidenceLevel = 'red' | 'yellow' | 'green';

export interface PageSignal {
  segmentId: string;
  confidence?: PageConfidenceLevel;
}

export interface DocumentReadinessSnapshot {
  pageCount: number;
  greenPages: number;
  yellowPages: number;
  redPages: number;
  updatedAt: Date;
}

export interface PageClearedEvent {
  page: number;
  from: 'red' | 'yellow';
  /** The sub-source sourceId the page belongs to, when the segmentId was
   *  qualified (`pdf:{subId}:p{N}`). Absent for legacy unqualified entries
   *  (`page-{N}`) where we can't tell which sub-source the rating targeted. */
  subSourceId?: string;
}

export interface ReadinessPersistResult {
  snapshot: DocumentReadinessSnapshot | null;
  pageCleared: PageClearedEvent[];
  /** True when this save crossed the "counts as a study session" threshold
   *  AND no session has been credited for this doc on the current UTC day. */
  sessionCrossed: boolean;
}

// Session-credit threshold: clamp(ceil(pageCount * 0.1), 3, 15).
// - Floor of 3 prevents a 30-second "rate five greens" from minting a streak
//   on a short doc (was the #1 gaming vector in the design review).
// - Cap of 15 keeps long textbooks reachable — no one rates 40 pages in one
//   sitting, and demanding that would push users to disengage.
// - The 10% fraction kicks in between doc sizes 30–150 pages, where raw
//   page counts stop being intuitive.
const SESSION_MIN_FLOOR = 3;
const SESSION_MAX_CEILING = 15;
const SESSION_FRACTION = 0.1;

// Qualified per-PDF format: `pdf:{subSourceId}:p{N}` — new as of the multi-PDF
// fix. Disambiguates which sub-source a page rating belongs to when a
// generation bundles multiple PDFs. `.+` is safe even if sub-source IDs contain
// colons: the trailing `:p\d+$` anchor + greedy match always bind to the final
// page token.
const PAGE_QUALIFIED_RE = /^pdf:(.+):p(\d+)$/;
// Legacy unqualified format: `page-{N}`. Kept readable by the parser so
// pre-migration ratings don't vanish from the UI — they silently show on every
// PDF in the generation until that page is re-rated (which writes a qualified
// entry and cleans up the legacy one).
const PAGE_LEGACY_RE = /^page-(\d+)$/;

export interface ParsedPageSegmentId {
  page: number;
  /** Present only when the segmentId was qualified. Absent for legacy ids. */
  subSourceId?: string;
}

export function parsePageSegmentId(segmentId: string): ParsedPageSegmentId | null {
  const qualified = PAGE_QUALIFIED_RE.exec(segmentId);
  if (qualified) {
    const n = Number.parseInt(qualified[2], 10);
    if (!Number.isFinite(n) || n <= 0) return null;
    return { page: n, subSourceId: qualified[1] };
  }
  const legacy = PAGE_LEGACY_RE.exec(segmentId);
  if (legacy) {
    const n = Number.parseInt(legacy[1], 10);
    if (!Number.isFinite(n) || n <= 0) return null;
    return { page: n };
  }
  return null;
}

export function parsePageFromSegmentId(segmentId: string): number | null {
  return parsePageSegmentId(segmentId)?.page ?? null;
}

export function summarisePageSignals(
  segmentNotes: PageSignal[] | undefined,
): { green: number; yellow: number; red: number; rated: number; maxPageSeen: number } {
  const counts = { green: 0, yellow: 0, red: 0, rated: 0, maxPageSeen: 0 };
  if (!segmentNotes?.length) return counts;

  for (const note of segmentNotes) {
    const page = parsePageFromSegmentId(note.segmentId);
    if (page === null) continue;
    if (page > counts.maxPageSeen) counts.maxPageSeen = page;

    switch (note.confidence) {
      case 'green':
        counts.green += 1;
        counts.rated += 1;
        break;
      case 'yellow':
        counts.yellow += 1;
        counts.rated += 1;
        break;
      case 'red':
        counts.red += 1;
        counts.rated += 1;
        break;
    }
  }
  return counts;
}

function maxPageIn(segments: { page?: number }[] | undefined): number {
  if (!segments?.length) return 0;
  let max = 0;
  for (const seg of segments) {
    if (typeof seg.page === 'number' && seg.page > max) max = seg.page;
  }
  return max;
}

/**
 * Resolve the total page-count denominator for a Note at sourceId.
 *
 * Single-source PDF generations: SourceContent(sourceId) has page-labeled
 * segments — return its max page.
 *
 * Multi-source generations (e.g. a YouTube parent with PDF sub-sources):
 * Notes are stored keyed to the *parent* generation ID, but the page data
 * lives on the sub-source SourceContents. We look up the parent's
 * `allSourceIds`, fetch every `document`-typed sub-source's SourceContent,
 * and sum their max pages to get a merged denominator.
 *
 * The sum is the honest choice: segmentIds are `page-N` without any
 * PDF-qualifier, so a single Note record pools ratings across all PDFs.
 * Using max would over-credit users who only studied one PDF; using sum
 * gives them partial credit proportional to which PDF they actually read.
 */
async function resolvePageCount(
  userId: Types.ObjectId | string,
  sourceId: string,
): Promise<number> {
  // Fast path: the Note's sourceId itself is a document SourceContent.
  const direct = await SourceContent.findOne({ userId, sourceId })
    .select({ segments: 1 })
    .lean<{ segments?: { page?: number }[] } | null>();
  const directMax = maxPageIn(direct?.segments);
  if (directMax > 0) return directMax;

  // Slow path: multi-source generation. Resolve the parent → sub-sources →
  // pool the PDF page counts.
  const video = await Video.findOne({ userId, videoId: sourceId })
    .select({ allSourceIds: 1 })
    .lean<{ allSourceIds?: string[] } | null>();
  const allSourceIds = video?.allSourceIds;
  if (!allSourceIds?.length) return 0;

  // Only document sub-sources carry page data. Querying a narrow
  // (sourceType='document') filter avoids pulling transcripts for YouTube
  // sub-sources that also live under the same allSourceIds array.
  const docSources = await Source.find({
    userId,
    sourceId: { $in: allSourceIds },
    sourceType: 'document',
  })
    .select({ sourceId: 1 })
    .lean<{ sourceId: string }[]>();
  if (!docSources.length) return 0;

  const docContents = await SourceContent.find({
    userId,
    sourceId: { $in: docSources.map((s) => s.sourceId) },
  })
    .select({ segments: 1 })
    .lean<{ segments?: { page?: number }[] }[]>();

  let total = 0;
  for (const content of docContents) total += maxPageIn(content.segments);
  return total;
}

function utcDateString(date = new Date()): string {
  return date.toISOString().split('T')[0];
}

/** Detect Red/Yellow → Green transitions between two snapshots of segment
 *  notes. We only care about transitions *into* green — moving Red↔Yellow
 *  or Green→Red is just normal rating churn, not a hero moment.
 *
 *  Keyed by the full segmentId so qualified entries (`pdf:A:p5` vs `pdf:B:p5`)
 *  track independently per sub-source. Legacy entries (`page-5`) stay in their
 *  own bucket — transitions from legacy-yellow to qualified-green aren't
 *  counted as clears, which is the honest call during migration: we can't tell
 *  whether the qualified green is "the same" rating the user is upgrading or a
 *  fresh rating on a different PDF. */
export function diffPageClears(
  previous: PageSignal[] | undefined,
  next: PageSignal[] | undefined,
): PageClearedEvent[] {
  if (!next?.length) return [];

  const priorById = new Map<string, PageConfidenceLevel | undefined>();
  for (const p of previous ?? []) {
    priorById.set(p.segmentId, p.confidence);
  }

  const cleared: PageClearedEvent[] = [];
  for (const n of next) {
    if (n.confidence !== 'green') continue;
    const parsed = parsePageSegmentId(n.segmentId);
    if (!parsed) continue;

    const prior = priorById.get(n.segmentId);
    if (prior === 'red' || prior === 'yellow') {
      cleared.push({
        page: parsed.page,
        from: prior,
        ...(parsed.subSourceId ? { subSourceId: parsed.subSourceId } : {}),
      });
    }
  }
  return cleared;
}

/**
 * Compute and persist a documentReadiness snapshot on the Progress record for
 * this (user, source) pair, returning:
 *   - the new snapshot (null when neither SourceContent nor ratings exist)
 *   - any Red/Yellow → Green transitions detected since the prior save
 *   - whether this save should be credited as a daily study session
 *     (threshold crossed and no session credited for this doc today)
 *
 * Callers are responsible for firing the downstream activity-log + streak
 * side-effects so this helper stays a pure readiness writer.
 */
export async function persistDocumentReadiness(
  userId: Types.ObjectId | string,
  sourceId: string,
  segmentNotes: PageSignal[] | undefined,
  previousSegmentNotes: PageSignal[] | undefined,
): Promise<ReadinessPersistResult> {
  const counts = summarisePageSignals(segmentNotes);
  // Never fall back to maxPageSeen: a user who rates 1 page of a 100-page
  // doc would otherwise read as 1/1 = 100% coverage. If SourceContent has
  // no page labels, we skip the readiness snapshot entirely and let
  // coverage treat this source as "unknown" rather than fake-complete.
  const pageCount = await resolvePageCount(userId, sourceId);
  const hasAnyRating = counts.rated > 0;

  if (!pageCount) {
    return { snapshot: null, pageCleared: [], sessionCrossed: false };
  }

  const snapshot: DocumentReadinessSnapshot = {
    pageCount,
    greenPages: counts.green,
    yellowPages: counts.yellow,
    redPages: counts.red,
    updatedAt: new Date(),
  };

  await dbConnect();

  const today = utcDateString();
  const ratedThreshold = Math.min(
    SESSION_MAX_CEILING,
    Math.max(SESSION_MIN_FLOOR, Math.ceil(pageCount * SESSION_FRACTION)),
  );
  const meetsSessionThreshold = hasAnyRating && counts.rated >= ratedThreshold;

  const setUpdate: Record<string, unknown> = {
    documentReadiness: snapshot,
    lastAccessedAt: new Date(),
  };
  if (meetsSessionThreshold) setUpdate.documentSessionLoggedOn = today;

  // Read the pre-update state so we can tell whether this save is the one
  // that actually crosses the "counts as a study session" line today.
  const prior = await Progress.findOne({ userId, sourceId })
    .select({ documentSessionLoggedOn: 1 })
    .lean<{ documentSessionLoggedOn?: string | null } | null>();
  const alreadyLoggedToday = prior?.documentSessionLoggedOn === today;

  await Progress.findOneAndUpdate(
    { userId, sourceId },
    { $set: setUpdate },
    { upsert: true, new: true },
  );

  const sessionCrossed = meetsSessionThreshold && !alreadyLoggedToday;
  const pageCleared = diffPageClears(previousSegmentNotes, segmentNotes);

  return { snapshot, pageCleared, sessionCrossed };
}
