import dbConnect from '@/lib/mongodb';
import Source from '@/lib/models/Source';
import Progress from '@/lib/models/Progress';
import User from '@/lib/models/User';
import { TOPIC_BUCKETS, BUCKET_THRESHOLD } from '@/lib/constants/topicBuckets';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface TopicCluster {
  id: string;
  name: string;
  score: number | null;   // null if no sources in cluster have a score yet
  sourceCount: number;
  coveredCount: number;   // sources with a clarity score
  relevance: number;      // 0–1 cosine similarity to user goal embedding
}

export interface FogAlert {
  clusterName: string;
  relevance: number;
  uncoveredCount: number;
}

export interface StretchSource {
  sourceId: string;
  title: string;
  relevance: number;
}

export interface ClarityInsights {
  clusters: TopicCluster[];
  fogAlerts: FogAlert[];
  stretchSources: StretchSource[];
  hasEnoughData: boolean;
  hasGoalEmbedding: boolean;
}

// ── In-memory cache (6-hour TTL, per user) ────────────────────────────────────

const CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const cache = new Map<string, { data: ClarityInsights; ts: number }>();

/** Call after any study activity to force a fresh insights computation on next load. */
export function clearInsightsCache(userId: string): void {
  cache.delete(userId);
}

// ── Vector math ───────────────────────────────────────────────────────────────

function dot(a: number[], b: number[]): number {
  return a.reduce((s, v, i) => s + v * b[i], 0);
}

function addVec(a: number[], b: number[]): number[] {
  return a.map((v, i) => v + b[i]);
}

function normalizeVec(v: number[]): number[] {
  const norm = Math.sqrt(v.reduce((s, x) => s + x * x, 0));
  return norm === 0 ? v : v.map((x) => x / norm);
}

// ── Bucket assignment ─────────────────────────────────────────────────────────

/** Returns the bucket id with highest cosine similarity, or null if below threshold. */
function assignBucket(embedding: number[]): { id: string; label: string; similarity: number } | null {
  let best: { id: string; label: string; similarity: number } | null = null;
  for (const bucket of TOPIC_BUCKETS) {
    const sim = dot(embedding, bucket.embedding);
    if (!best || sim > best.similarity) {
      best = { id: bucket.id, label: bucket.label, similarity: sim };
    }
  }
  return best && best.similarity >= BUCKET_THRESHOLD ? best : null;
}

// ── DB row types ──────────────────────────────────────────────────────────────

type SourceRow = { sourceId: string; title: string; embedding?: number[] };
type ProgressRow = { sourceId: string; readinessScore?: { score: number } };
type UserRow = { preferences?: { embedding?: number[] } } | null;

// ── Main export ───────────────────────────────────────────────────────────────

export async function getClarityInsights(userId: string): Promise<ClarityInsights> {
  const hit = cache.get(userId);
  if (hit && Date.now() - hit.ts < CACHE_TTL_MS) return hit.data;

  await dbConnect();

  const [sources, progresses, user] = await Promise.all([
    Source.find({ userId, processingStatus: { $in: ['completed', 'completed_with_warning'] } })
      .select('sourceId title embedding')
      .lean() as unknown as Promise<SourceRow[]>,
    Progress.find({ userId }).select('sourceId readinessScore').lean() as unknown as Promise<ProgressRow[]>,
    User.findById(userId).select('preferences.embedding').lean() as unknown as Promise<UserRow>,
  ]);

  const scoreMap = new Map(
    progresses.map((p) => [p.sourceId, p.readinessScore?.score ?? null])
  );
  const withEmbed = sources.filter((s) => s.embedding && s.embedding.length > 0);
  const userEmb = user?.preferences?.embedding ?? null;
  const hasGoalEmbedding = Array.isArray(userEmb) && userEmb.length > 0;

  const empty: ClarityInsights = {
    clusters: [],
    fogAlerts: [],
    stretchSources: [],
    hasEnoughData: false,
    hasGoalEmbedding,
  };

  if (withEmbed.length < 3) {
    cache.set(userId, { data: empty, ts: Date.now() });
    return empty;
  }

  // ── Assign each source to its nearest bucket ──────────────────────────────

  // Map: bucketId → list of sources
  const bucketMap = new Map<string, { label: string; sources: { sourceId: string; title: string; score: number | null }[] }>();
  const unassigned: { sourceId: string; title: string; embedding: number[]; score: number | null }[] = [];

  for (const src of withEmbed) {
    const score = scoreMap.get(src.sourceId) ?? null;
    const assignment = assignBucket(src.embedding!);
    if (assignment) {
      if (!bucketMap.has(assignment.id)) {
        bucketMap.set(assignment.id, { label: assignment.label, sources: [] });
      }
      bucketMap.get(assignment.id)!.sources.push({ sourceId: src.sourceId, title: src.title, score });
    } else {
      unassigned.push({ sourceId: src.sourceId, title: src.title, embedding: src.embedding!, score });
    }
  }

  // Put leftover sources into an "Other" bucket if any
  if (unassigned.length > 0) {
    bucketMap.set('other', {
      label: 'General Learning',
      sources: unassigned.map(({ sourceId, title, score }) => ({ sourceId, title, score })),
    });
  }

  // ── Build clusters ────────────────────────────────────────────────────────

  const clusters: TopicCluster[] = [];

  for (const [id, { label, sources: items }] of bucketMap.entries()) {
    const scored = items.filter((i) => i.score !== null);
    const avgScore =
      scored.length > 0
        ? Math.round(scored.reduce((s, i) => s + i.score!, 0) / scored.length)
        : null;

    // Cluster centroid = average of source embeddings in this cluster (for relevance calc)
    let relevance = 0;
    if (hasGoalEmbedding) {
      const clusterSources = withEmbed.filter((s) => {
        const a = assignBucket(s.embedding!);
        return a ? a.id === id : id === 'other';
      });
      if (clusterSources.length > 0) {
        const dim = clusterSources[0].embedding!.length;
        const sum = clusterSources.reduce(
          (acc, s) => addVec(acc, s.embedding!),
          new Array(dim).fill(0) as number[]
        );
        const centroid = normalizeVec(sum.map((x) => x / clusterSources.length));
        relevance = Math.round(Math.max(0, dot(userEmb!, centroid)) * 100) / 100;
      }
    }

    clusters.push({
      id,
      name: label,
      score: avgScore,
      sourceCount: items.length,
      coveredCount: scored.length,
      relevance,
    });
  }

  // Sort: by score desc (null last), then by sourceCount desc
  clusters.sort((a, b) => {
    if (a.score !== null && b.score !== null) return b.score - a.score;
    if (a.score !== null) return -1;
    if (b.score !== null) return 1;
    return b.sourceCount - a.sourceCount;
  });

  // ── Fog alerts: relevant clusters with low/zero coverage ──────────────────
  // Only meaningful when there's contrast — at least one topic already has coverage.
  // If nothing has been studied yet, everything is "unexplored" which is obvious noise.

  const hasAnyCoverage = clusters.some((c) => c.coveredCount > 0);

  const fogAlerts: FogAlert[] = hasGoalEmbedding && hasAnyCoverage
    ? clusters
        .filter(
          (c) =>
            c.id !== 'other' &&
            c.relevance > 0.5 &&
            (c.coveredCount === 0 || (c.score !== null && c.score < 40))
        )
        .sort((a, b) => b.relevance - a.relevance)
        .slice(0, 3)
        .map((c) => ({
          clusterName: c.name,
          relevance: c.relevance,
          uncoveredCount: c.sourceCount - c.coveredCount,
        }))
    : [];

  // ── Stretch sources: unstudied + assigned to "other" or low relevance ──────

  const stretchSources: StretchSource[] = hasGoalEmbedding
    ? unassigned
        .filter((s) => (scoreMap.get(s.sourceId) ?? null) === null)
        .slice(0, 5)
        .map((s) => ({
          sourceId: s.sourceId,
          title: s.title,
          relevance: Math.round(dot(userEmb!, s.embedding) * 100) / 100,
        }))
    : [];

  const result: ClarityInsights = {
    clusters,
    fogAlerts,
    stretchSources,
    hasEnoughData: true,
    hasGoalEmbedding,
  };

  cache.set(userId, { data: result, ts: Date.now() });
  return result;
}
