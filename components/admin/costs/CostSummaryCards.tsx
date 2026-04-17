'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  DollarSign,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  ShieldX,
  TrendingUp,
  Users,
} from 'lucide-react';
import { getUserFriendlyMessage } from '@/lib/utils/user-error';
import { formatCost, formatCount, formatPercent } from '@/lib/cost/format';
import CostSkeleton from './shared/CostSkeleton';

interface ServiceStatusBreakdown {
  service: string;
  totalCost: number;
  successCost: number;
  wastedCost: number;
  rejectedCost: number;
  operations: number;
}

interface CostSummary {
  totalCost: number;
  successCost: number;
  wastedCost: number;
  rejectedCost: number;
  projectedMonthlyCost: number;
  activeUsers: number;
  totalUsers: number;
  byService: ServiceStatusBreakdown[];
}

interface CostSummaryCardsProps {
  days: number;
  onLoaded?: (summary: CostSummary) => void;
}

// Overview summary strip. Surfaces the four spend buckets (success, wasted,
// rejected, total) side by side, alongside projected monthly burn and
// active users. Every colored state pairs with an icon and a text label so
// WCAG 1.4.1 "color alone" is satisfied.
export default function CostSummaryCards({ days, onLoaded }: CostSummaryCardsProps) {
  const [summary, setSummary] = useState<CostSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSummary = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/analytics/costs/summary?days=${days}`);
      if (!response.ok) {
        throw new Error('Failed to fetch cost summary');
      }
      const data = await response.json();
      if (data.success) {
        setSummary(data.summary);
        onLoaded?.(data.summary);
      } else {
        throw new Error(data.message || 'Failed to load data');
      }
    } catch (err) {
      setError(getUserFriendlyMessage(err, "We couldn't load cost summary data."));
    } finally {
      setLoading(false);
    }
  }, [days, onLoaded]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  if (loading && !summary) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[0, 1, 2, 3].map((i) => (
          <CostSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-card-bg border border-border rounded-xl p-6" role="alert">
        <div className="flex items-center space-x-2 text-red-500">
          <AlertCircle className="w-5 h-5" aria-hidden="true" />
          <span>Error loading cost summary: {error}</span>
        </div>
      </div>
    );
  }

  if (!summary) return null;

  const wastedPct = summary.totalCost > 0 ? (summary.wastedCost / summary.totalCost) * 100 : 0;
  const rejectedPct = summary.totalCost > 0 ? (summary.rejectedCost / summary.totalCost) * 100 : 0;
  const costPerActive = summary.activeUsers > 0 ? summary.totalCost / summary.activeUsers : 0;
  const wastedAlert = summary.wastedCost > 0;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card
          label="Total Spend"
          status="Window total"
          value={formatCost(summary.totalCost)}
          helper={`Last ${days} days · success + wasted + rejected`}
          icon={<DollarSign className="w-5 h-5" aria-hidden="true" />}
          tone="neutral"
        />

        <Card
          label="Healthy Spend"
          status="Success"
          value={formatCost(summary.successCost)}
          helper="Provider billed · pipeline succeeded"
          icon={<CheckCircle2 className="w-5 h-5" aria-hidden="true" />}
          tone="success"
        />

        <Card
          label="Wasted Spend"
          status={wastedAlert ? 'Action needed' : 'Clean'}
          value={formatCost(summary.wastedCost)}
          helper={
            wastedAlert
              ? `${formatPercent(wastedPct)} of total · billed but unusable`
              : 'No failed provider calls in window'
          }
          icon={<AlertTriangle className="w-5 h-5" aria-hidden="true" />}
          tone={wastedAlert ? 'danger' : 'neutral'}
        />

        <Card
          label="Rejected Spend"
          status={summary.rejectedCost > 0 ? 'Review' : 'Clean'}
          value={formatCost(summary.rejectedCost)}
          helper={
            summary.rejectedCost > 0
              ? `${formatPercent(rejectedPct)} of total · validation rejected`
              : 'No rejected operations in window'
          }
          icon={<ShieldX className="w-5 h-5" aria-hidden="true" />}
          tone={summary.rejectedCost > 0 ? 'warning' : 'neutral'}
        />
      </div>

      <div className="bg-card-bg border border-border rounded-xl px-5 py-3">
        <dl className="flex flex-col md:flex-row md:items-center md:divide-x md:divide-border gap-y-3 md:gap-y-0">
          <EconomicsStat
            icon={<TrendingUp className="w-4 h-4 text-accent" aria-hidden="true" />}
            label="Projected monthly burn"
            value={formatCost(summary.projectedMonthlyCost)}
            valueTone="accent"
          />
          <EconomicsStat
            icon={<Users className="w-4 h-4 text-muted-foreground" aria-hidden="true" />}
            label="Active users"
            value={`${formatCount(summary.activeUsers)} / ${formatCount(summary.totalUsers)}`}
          />
          <EconomicsStat
            icon={<DollarSign className="w-4 h-4 text-accent" aria-hidden="true" />}
            label="Cost per active user"
            value={formatCost(costPerActive)}
            valueTone="accent"
          />
        </dl>
      </div>
    </div>
  );
}

interface EconomicsStatProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  valueTone?: 'accent' | 'foreground';
}

function EconomicsStat({ icon, label, value, valueTone = 'foreground' }: EconomicsStatProps) {
  const valueClass = valueTone === 'accent' ? 'text-accent' : 'text-foreground';
  return (
    <div className="flex items-center gap-2 md:px-5 first:md:pl-0 last:md:pr-0 min-w-0">
      {icon}
      <dt className="text-xs text-muted-foreground uppercase tracking-wide shrink-0">{label}</dt>
      <dd className={`text-sm font-semibold ${valueClass} truncate`}>{value}</dd>
    </div>
  );
}

type Tone = 'neutral' | 'success' | 'warning' | 'danger' | 'accent';

interface CardProps {
  label: string;
  status: string;
  value: string;
  helper: string;
  icon: React.ReactNode;
  tone: Tone;
}

function Card({ label, status, value, helper, icon, tone }: CardProps) {
  const toneClasses: Record<Tone, { border: string; value: string; badgeBg: string; badgeText: string; iconBg: string; iconColor: string }> = {
    neutral: {
      border: 'border-border',
      value: 'text-foreground',
      badgeBg: 'bg-secondary/20',
      badgeText: 'text-muted-foreground',
      iconBg: 'bg-secondary/20',
      iconColor: 'text-muted-foreground',
    },
    success: {
      border: 'border-border',
      value: 'text-green-500',
      badgeBg: 'bg-green-500/10',
      badgeText: 'text-green-600 dark:text-green-400',
      iconBg: 'bg-green-500/10',
      iconColor: 'text-green-500',
    },
    warning: {
      border: 'border-amber-500/40',
      value: 'text-amber-500',
      badgeBg: 'bg-amber-500/10',
      badgeText: 'text-amber-600 dark:text-amber-400',
      iconBg: 'bg-amber-500/10',
      iconColor: 'text-amber-500',
    },
    danger: {
      border: 'border-red-500/40',
      value: 'text-red-500',
      badgeBg: 'bg-red-500/10',
      badgeText: 'text-red-600 dark:text-red-400',
      iconBg: 'bg-red-500/10',
      iconColor: 'text-red-500',
    },
    accent: {
      border: 'border-border',
      value: 'text-foreground',
      badgeBg: 'bg-accent/10',
      badgeText: 'text-accent',
      iconBg: 'bg-accent/10',
      iconColor: 'text-accent',
    },
  };
  const t = toneClasses[tone];

  return (
    <div
      className={`bg-card-bg border ${t.border} rounded-xl p-5 transition-colors hover:border-accent/30`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className={`text-2xl md:text-3xl font-bold mt-1 ${t.value}`}>{value}</p>
          <div className="flex items-center gap-2 mt-2">
            <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-semibold ${t.badgeBg} ${t.badgeText}`}>
              {status}
            </span>
            <span className="text-xs text-muted-foreground truncate">{helper}</span>
          </div>
        </div>
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${t.iconBg} ${t.iconColor}`}>
          {icon}
        </div>
      </div>
    </div>
  );
}
