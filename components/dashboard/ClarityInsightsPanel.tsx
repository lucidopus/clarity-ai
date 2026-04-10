'use client';

import { useState, useEffect } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Layers, Compass, Zap, Settings, ChevronRight, ChevronDown } from 'lucide-react';
import { useRouter } from 'next/navigation';
import type { ClarityInsights, TopicCluster, FogAlert } from '@/lib/services/clarityInsights';

type LoadState = 'loading' | 'error' | 'insufficient' | 'ready';

// ── Helpers ───────────────────────────────────────────────────────────────────

function clusterTier(score: number | null) {
  if (score === null) return { label: 'Not started', bar: 'bg-muted/40',   text: 'text-muted-foreground' };
  if (score >= 70)   return { label: 'Strong',       bar: 'bg-accent',     text: 'text-accent font-semibold' };
  if (score >= 40)   return { label: 'Developing',   bar: 'bg-accent/60',  text: 'text-accent/80 font-semibold' };
  return                    { label: 'Needs work',   bar: 'bg-accent/30',  text: 'text-accent/60 font-semibold' };
}

// ── Sub-components ────────────────────────────────────────────────────────────

function ClusterBar({ cluster, reduced }: { cluster: TopicCluster; reduced: boolean }) {
  const tier = clusterTier(cluster.score);
  const scoreDisplay = cluster.score !== null ? `${cluster.score}%` : '—';

  return (
    <div>
      <div className="flex items-center justify-between text-xs mb-1">
        <span className="text-foreground font-medium truncate mr-2">{cluster.name}</span>
        <div className="flex items-center gap-1.5 shrink-0">
          <span className={tier.text}>{scoreDisplay}</span>
          <span className="text-[11px] text-muted-foreground">{tier.label}</span>
        </div>
      </div>
      <div
        className="h-1.5 rounded-full bg-muted/30 overflow-hidden"
        role="progressbar"
        aria-valuenow={cluster.score ?? 0}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${cluster.name}: ${scoreDisplay}, ${tier.label}. ${cluster.coveredCount} of ${cluster.sourceCount} sources studied.`}
      >
        <motion.div
          className={`h-full w-full rounded-full origin-left ${tier.bar}`}
          initial={{ scaleX: 0 }}
          animate={{ scaleX: (cluster.score ?? 0) / 100 }}
          transition={{ duration: reduced ? 0 : 0.6, ease: 'easeOut' }}
        />
      </div>
      {/* Issue 8: bumped from text-[10px] to text-xs */}
      <div className="text-xs text-muted-foreground mt-0.5">
        {cluster.coveredCount}/{cluster.sourceCount} {cluster.sourceCount === 1 ? 'source' : 'sources'} studied
      </div>
    </div>
  );
}

function ExploreItem({ alert, onClick }: { alert: FogAlert; onClick: () => void }) {
  const pct = Math.round(alert.relevance * 100);
  return (
    // Issue 2: neutral styling, clickable, ChevronRight — no amber
    <button
      onClick={onClick}
      className="w-full flex items-center gap-2.5 py-2 border-b border-border/50 last:border-0 hover:bg-muted/20 -mx-3 px-3 transition-colors text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-inset rounded"
    >
      {/* Issue 5: Compass instead of AlertCircle */}
      <div className="w-5 h-5 rounded-full bg-accent/10 flex items-center justify-center shrink-0">
        <Compass className="w-3 h-3 text-accent" aria-hidden="true" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-foreground">{alert.clusterName}</div>
        <div className="text-xs text-muted-foreground">
          {alert.uncoveredCount > 0
            ? `${alert.uncoveredCount} source${alert.uncoveredCount !== 1 ? 's' : ''} to explore`
            : 'Low clarity — worth revisiting'}{' '}
          · {pct}% goal alignment
        </div>
      </div>
      <ChevronRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" aria-hidden="true" />
    </button>
  );
}

function Skeleton() {
  return (
    <div className="bg-card-bg border border-border rounded-2xl p-6 animate-pulse">
      <div className="flex items-center gap-2 mb-5">
        <div className="w-8 h-8 rounded-lg bg-secondary/20" />
        <div className="h-4 w-36 rounded bg-secondary/20" />
      </div>
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i}>
            <div className="flex justify-between mb-1">
              <div className="h-3 w-24 rounded bg-secondary/20" />
              <div className="h-3 w-16 rounded bg-secondary/20" />
            </div>
            <div className="h-1.5 rounded-full bg-secondary/10" />
            <div className="h-2 w-20 rounded bg-secondary/10 mt-0.5" />
          </div>
        ))}
      </div>
    </div>
  );
}

// Issue 10: Onboarding state instead of silent null return
function InsufficientData() {
  return (
    <div className="bg-card-bg border border-border rounded-2xl p-6 flex flex-col justify-center min-h-[200px]">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center">
          <Layers className="w-4 h-4 text-accent" aria-hidden="true" />
        </div>
        <span className="font-semibold text-foreground">Knowledge Map</span>
      </div>
      <p className="text-sm text-muted-foreground">
        Process <span className="font-medium text-foreground">3 or more sources</span> to unlock
        topic-level clarity insights and see where your knowledge is strongest.
      </p>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

const MAX_VISIBLE_CLUSTERS = 3;

export default function ClarityInsightsPanel() {
  const reduced = useReducedMotion() ?? false;
  const router = useRouter();
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [data, setData] = useState<ClarityInsights | null>(null);
  const [showAllClusters, setShowAllClusters] = useState(false);
  const [showStretch, setShowStretch] = useState(false);

  useEffect(() => {
    let mounted = true;
    fetch('/api/readiness/insights')
      .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
      .then((d: ClarityInsights) => {
        if (mounted) {
          setData(d);
          setLoadState(d.hasEnoughData ? 'ready' : 'insufficient');
        }
      })
      .catch(() => { if (mounted) setLoadState('error'); });
    return () => { mounted = false; };
  }, []);

  if (loadState === 'loading') return <Skeleton />;
  // Issue 10: preserve grid cell on error to avoid layout shift
  if (loadState === 'error') return <div aria-hidden="true" />;
  if (loadState === 'insufficient') return <InsufficientData />;

  const { clusters, fogAlerts, stretchSources, hasGoalEmbedding } = data!;
  const visibleClusters = showAllClusters ? clusters : clusters.slice(0, MAX_VISIBLE_CLUSTERS);
  const hiddenCount = clusters.length - MAX_VISIBLE_CLUSTERS;

  return (
    <motion.div
      initial={reduced ? { opacity: 0 } : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className="bg-card-bg border border-border rounded-2xl p-5"
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-1">
        <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center">
          <Layers className="w-4 h-4 text-accent" aria-hidden="true" />
        </div>
        <span className="font-semibold text-foreground">Knowledge Map</span>
      </div>
      <p className="text-xs text-muted-foreground mb-4 pl-10">How your sources break down by topic</p>

      {/* Cluster bars */}
      <div className="space-y-3">
        {visibleClusters.map((cluster) => (
          <ClusterBar key={cluster.id} cluster={cluster} reduced={reduced} />
        ))}
      </div>

      {/* Show more / less */}
      {hiddenCount > 0 && (
        <button
          onClick={() => setShowAllClusters((v) => !v)}
          className="mt-3 flex items-center gap-1 text-xs text-accent hover:text-accent/80 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1 rounded"
        >
          <ChevronDown
            className={`w-3.5 h-3.5 transition-transform ${showAllClusters ? 'rotate-180' : ''}`}
            aria-hidden="true"
          />
          {showAllClusters ? 'Show less' : `Show ${hiddenCount} more topic${hiddenCount !== 1 ? 's' : ''}`}
        </button>
      )}

      {/* Areas to Explore */}
      {hasGoalEmbedding && fogAlerts.length > 0 && (
        <div className="mt-4">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            Areas to Explore
          </div>
          <div className="rounded-xl border border-border bg-muted/10 px-3">
            {fogAlerts.map((alert) => (
              <ExploreItem
                key={alert.clusterName}
                alert={alert}
                onClick={() =>
                  router.push(`/dashboard/gallery?topic=${encodeURIComponent(alert.clusterName)}`)
                }
              />
            ))}
          </div>
        </div>
      )}

      {/* Stretch Topics — collapsed by default */}
      {hasGoalEmbedding && stretchSources.length > 0 && (
        <div className="mt-4">
          <button
            onClick={() => setShowStretch((v) => !v)}
            className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1 rounded"
            aria-expanded={showStretch}
          >
            <ChevronDown
              className={`w-3 h-3 transition-transform ${showStretch ? 'rotate-180' : ''}`}
              aria-hidden="true"
            />
            {/* Issue 7: no long paragraph — label + count is enough */}
            Stretch Topics ({stretchSources.length})
          </button>
          {showStretch && (
            <div className="space-y-1.5 mt-2">
              {stretchSources.map((s) => (
                <div key={s.sourceId} className="flex items-center gap-2 text-sm">
                  <Zap className="w-3.5 h-3.5 text-muted-foreground shrink-0" aria-hidden="true" />
                  <span className="text-foreground truncate flex-1">{s.title}</span>
                  <span className="text-xs text-muted-foreground shrink-0">Off-goal</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Profile CTA */}
      {!hasGoalEmbedding && (
        <div className="mt-4">
          <button
            onClick={() => router.push('/dashboard/settings')}
            className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl bg-muted/20 hover:bg-muted/30 transition-colors text-sm text-foreground cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
            aria-label="Complete your learning profile for personalized insights"
          >
            <div className="flex items-center gap-2">
              <Settings className="w-4 h-4 text-muted-foreground" aria-hidden="true" />
              <span>Complete your profile for goal-based insights</span>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground" aria-hidden="true" />
          </button>
        </div>
      )}
    </motion.div>
  );
}
