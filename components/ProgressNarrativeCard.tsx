'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Flame, Brain, Target, TrendingUp, Sparkles } from 'lucide-react';

interface NarrativeData {
  narrative: string;
  category: 'streak' | 'retention' | 'mastery' | 'consistency' | 'growth' | 'welcome';
}

const CATEGORY_CONFIG: Record<NarrativeData['category'], { icon: typeof Flame; accentClass: string }> = {
  streak:      { icon: Flame,      accentClass: 'text-orange-500 bg-orange-500/10' },
  retention:   { icon: Brain,      accentClass: 'text-purple-500 bg-purple-500/10' },
  mastery:     { icon: Target,     accentClass: 'text-green-500 bg-green-500/10' },
  consistency: { icon: TrendingUp, accentClass: 'text-blue-500 bg-blue-500/10' },
  growth:      { icon: Sparkles,   accentClass: 'text-accent bg-accent/10' },
  welcome:     { icon: Sparkles,   accentClass: 'text-accent bg-accent/10' },
};

export default function ProgressNarrativeCard() {
  const [data, setData] = useState<NarrativeData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    fetch('/api/dashboard/progress-narrative')
      .then((r) => r.json())
      .then((d) => { if (mounted) setData(d); })
      .catch(() => {})
      .finally(() => { if (mounted) setLoading(false); });

    return () => { mounted = false; };
  }, []);

  // Listen for activity events to refresh
  useEffect(() => {
    const handler = () => {
      fetch('/api/dashboard/progress-narrative')
        .then((r) => r.json())
        .then(setData)
        .catch(() => {});
    };
    window.addEventListener('activity:logged', handler);
    return () => window.removeEventListener('activity:logged', handler);
  }, []);

  if (loading) {
    return (
      <div className="bg-card-bg border border-border rounded-2xl p-5 animate-pulse">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-secondary/20 shrink-0" />
          <div className="flex-1 space-y-2 pt-1">
            <div className="h-3.5 w-3/4 rounded bg-secondary/20" />
            <div className="h-3 w-1/2 rounded bg-secondary/15" />
          </div>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const config = CATEGORY_CONFIG[data.category] || CATEGORY_CONFIG.growth;
  const Icon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.1 }}
      className="bg-card-bg border border-border rounded-2xl p-5 flex flex-col justify-center"
    >
      <div className="flex items-start gap-3">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${config.accentClass}`}>
          <Icon className="w-4.5 h-4.5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-muted-foreground mb-1">Your Progress</p>
          <p className="text-sm text-foreground leading-relaxed">{data.narrative}</p>
        </div>
      </div>
    </motion.div>
  );
}
