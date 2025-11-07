"use client";

import { useEffect, useMemo, useRef, useState } from 'react';
import HeatmapTooltip, { type HeatmapTooltipState } from './HeatmapTooltip';

type HeatmapDay = { date: string; count: number; level: 0 | 1 | 2 | 3 };

type View = 'month' | 'year';

function monthShort(date: Date) {
  return date.toLocaleString(undefined, { month: 'short' });
}

// Parse YYYY-MM-DD string as a local calendar date (not UTC)
function parseDateStringAsLocal(dateString: string): Date {
  const [year, month, day] = dateString.split('-').map(Number);
  // new Date(year, monthIndex, day) creates a date at midnight in the local timezone
  return new Date(year, month - 1, day);
}

function formatFriendlyDate(isoLike: string) {
  const d = parseDateStringAsLocal(isoLike);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function formatActivities(count: number, dateISO: string) {
  const dateLabel = formatFriendlyDate(dateISO);
  if (!count) return `No activity on ${dateLabel}`;
  if (count === 1) return `1 activity on ${dateLabel}`;
  return `${count} activities on ${dateLabel}`;
}

declare global {
  interface Window {
    __heatmapDailyInterval?: ReturnType<typeof setInterval>;
  }
}

export default function StudyActivityHeatmap() {
  const [view, setView] = useState<View>('year');
  const [days, setDays] = useState<HeatmapDay[]>([]);
  const [startDate, setStartDate] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshTick, setRefreshTick] = useState(0); // increments at midnight
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [tooltip, setTooltip] = useState<HeatmapTooltipState>({ visible: false, text: '', x: 0, y: 0 });

  // Listen for activity events to refresh immediately
  useEffect(() => {
    const handler = () => setRefreshTick((t) => t + 1);
    if (typeof window !== 'undefined') {
      window.addEventListener('activity:logged', handler);
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('activity:logged', handler);
      }
    };
  }, []);

  // Refresh when page becomes visible (tab switching, returning to browser)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        setRefreshTick((t) => t + 1);
      }
    };

    const handleFocus = () => {
      setRefreshTick((t) => t + 1);
    };

    if (typeof window !== 'undefined') {
      document.addEventListener('visibilitychange', handleVisibilityChange);
      window.addEventListener('focus', handleFocus);
    }

    return () => {
      if (typeof window !== 'undefined') {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        window.removeEventListener('focus', handleFocus);
      }
    };
  }, []);

  // Auto-refresh at next midnight, then every 24h
  useEffect(() => {
    function msUntilNextMidnight() {
      const now = new Date();
      const next = new Date(now);
      next.setHours(24, 0, 5, 0); // small buffer after midnight
      return next.getTime() - now.getTime();
    }

    const firstTimeout = setTimeout(() => {
      setRefreshTick((t) => t + 1);
      const daily = setInterval(() => setRefreshTick((t) => t + 1), 24 * 60 * 60 * 1000);
      window.__heatmapDailyInterval = daily;
    }, msUntilNextMidnight());

    return () => {
      clearTimeout(firstTimeout);
      if (window.__heatmapDailyInterval) {
        clearInterval(window.__heatmapDailyInterval);
        window.__heatmapDailyInterval = undefined;
      }
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/dashboard/activity-heatmap?view=${view}`);
        if (!res.ok) throw new Error('Failed to load heatmap');
        const data = await res.json() as {
          activities?: HeatmapDay[];
          startDate?: string | null;
          endDate?: string | null;
        };
        if (mounted) {
          setDays(data.activities || []);
          setStartDate(data.startDate || null);
        }
      } catch (e: unknown) {
        if (mounted) {
          const message = e instanceof Error ? e.message : 'Error';
          setError(message);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, [view, refreshTick]);

  // Build padded grid like GitHub: weeks in columns, weekdays in rows (Sun..Sat)
  const padded = useMemo<(HeatmapDay | null)[]>(() => {
    if (!startDate) return [...days];
    const start = parseDateStringAsLocal(startDate);
    const leading = start.getDay(); // 0..6, Sun..Sat
    const blanks: Array<HeatmapDay | null> = Array.from({ length: leading }, () => null);
    return [...blanks, ...days];
  }, [days, startDate]);

  const weekColumns = useMemo(() => Math.ceil(padded.length / 7), [padded.length]);

  // Scroll to the latest week (rightmost) after data renders
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    requestAnimationFrame(() => {
      el.scrollLeft = el.scrollWidth - el.clientWidth;
    });
  }, [weekColumns, view]);

  const cellClass = (level: 0 | 1 | 2 | 3) => {
    switch (level) {
      case 0: return 'bg-slate-200 dark:bg-slate-900/60 outline outline-slate-300/40 dark:outline-slate-700/80';
      case 1: return 'bg-cyan-200 dark:bg-cyan-700/70';
      case 2: return 'bg-cyan-300 dark:bg-cyan-500/90';
      case 3: return 'bg-cyan-400 dark:bg-cyan-400';
    }
  };

  const monthMarkers = useMemo(() => {
    const markers: Array<{ label: string; week: number }> = [];
    let lastMonth = -1;

    for (let i = 0; i < padded.length; i++) {
      const entry = padded[i];
      if (!entry) continue;

      const d = parseDateStringAsLocal(entry.date);
      const currentMonth = d.getMonth();

      // Add marker when month changes (works for any date range)
      if (currentMonth !== lastMonth) {
        const label = monthShort(d);
        const week = Math.floor(i / 7);
        markers.push({ label, week });
        lastMonth = currentMonth;
      }
    }
    return markers;
  }, [padded]);

  const railWidthPx = 28;

  return (
    <div className="bg-card-bg border border-border rounded-2xl p-6 heatmap-grid-container">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-foreground">Study Activity</h3>
        {/* Merged pill toggle */}
        <div className="inline-flex items-center overflow-hidden rounded-full border border-border">
          <button
            className={`px-3 py-1 cursor-pointer text-sm ${view==='month' ? 'bg-accent text-white' : 'bg-transparent text-foreground hover:bg-accent/10'}`}
            onClick={() => setView('month')}
          >This month</button>
          <button
            className={`px-3 py-1 cursor-pointer text-sm ${view==='year' ? 'bg-accent text-white' : 'bg-transparent text-foreground hover:bg-accent/10'}`}
            onClick={() => setView('year')}
          >Full Year</button>
        </div>
      </div>

      {loading && <div className="text-sm text-muted-foreground">Loading heatmap…</div>}
      {error && <div className="text-sm text-red-500">{error}</div>}

      {!loading && !error && (
        <>
          <div ref={scrollRef} className="overflow-x-auto overflow-y-hidden relative heatmap-scroll">
            {/* Month labels - match grid structure exactly */}
            <div className="flex mb-2">
              <div className="mr-2" style={{ width: railWidthPx }} />
              <div className="pr-8">
                <div className="flex ml-15 font-semibold text-xs text-muted-foreground select-none" style={{ columnGap: 'var(--cell-gap)' }}>
                  {Array.from({ length: weekColumns }).map((_, col) => {
                    const marker = monthMarkers.find(m => m.week === col);
                    return (
                      <div key={col} className="text-center" style={{ width: 'var(--cell-size)', minWidth: 'var(--cell-size)', flex: '0 0 var(--cell-size)' }}>
                        {marker ? marker.label : ''}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="flex pt-3">
              {/* Weekday labels */}
              <div className="mr-2 font-semibold mt-4 flex flex-col justify-between text-xs text-muted-foreground select-none" style={{ width: railWidthPx }}>
                <span>Mon</span>
                <span>Wed</span>
                <span>Fri</span>
              </div>

              {/* Grid */}
              <div className="pr-8">
                <div className="relative h-[140px]">
                  <div
                    className="grid"
                    style={{
                      gridAutoFlow: 'column',
                      gridTemplateRows: 'repeat(7, minmax(0, 1fr))',
                      gap: 'var(--cell-gap)'
                    }}
                  >
                    {padded.map((entry, idx) => {
                      const row = (idx % 7) + 1; // 1..7
                      return (
                        <div key={idx} style={{ gridRow: row }} className="group relative">
                          {entry ? (
                            <div
                              className={`${cellClass(entry.level)} rounded-[3px] transition-colors group-hover:outline-2 group-hover:outline-cyan-400/40 cursor-pointer`}
                              style={{ width: 'var(--cell-size)', height: 'var(--cell-size)' }}
                              onMouseEnter={(e) => {
                                const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
                                setTooltip({
                                  visible: true,
                                  text: formatActivities(entry.count, entry.date),
                                  x: rect.left + rect.width / 2,
                                  y: rect.top - 6,
                                });
                              }}
                              onMouseLeave={() => setTooltip((t) => ({ ...t, visible: false }))}
                            />
                          ) : (
                            <div style={{ width: 'var(--cell-size)', height: 'var(--cell-size)' }} className="rounded-[3px] bg-transparent" />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Legend (static, outside the scroll area) */}
          <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
            <span>Less</span>
            <div className="w-4 h-4 rounded-[3px] bg-slate-200 dark:bg-slate-900/60 outline outline-slate-300/40 dark:outline-slate-700/80" />
            <div className="w-4 h-4 rounded-[3px] bg-cyan-200 dark:bg-cyan-700/70" />
            <div className="w-4 h-4 rounded-[3px] bg-cyan-300 dark:bg-cyan-500/90" />
            <div className="w-4 h-4 rounded-[3px] bg-cyan-400 dark:bg-cyan-400" />
            <span>More</span>
          </div>

          <HeatmapTooltip state={tooltip} />
        </>
      )}
    </div>
  );
}
