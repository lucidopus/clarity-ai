'use client';

import { Info, Lightbulb, AlertTriangle } from 'lucide-react';
import type { CalloutSpec, CalloutType } from '@/lib/types/visualization';

type Props = CalloutSpec;

const STYLES: Record<CalloutType, { container: string; icon: string; iconBg: string; title: string }> = {
  info: {
    container: 'border-accent/30 bg-accent/5',
    icon: 'text-accent',
    iconBg: 'bg-accent/10',
    title: 'text-accent',
  },
  insight: {
    container: 'border-amber-500/30 bg-amber-500/5',
    icon: 'text-amber-600 dark:text-amber-400',
    iconBg: 'bg-amber-500/10',
    title: 'text-amber-700 dark:text-amber-300',
  },
  warn: {
    container: 'border-red-500/30 bg-red-500/5',
    icon: 'text-red-600 dark:text-red-400',
    iconBg: 'bg-red-500/10',
    title: 'text-red-700 dark:text-red-300',
  },
};

const ICON: Record<CalloutType, React.ComponentType<{ className?: string }>> = {
  info: Info,
  insight: Lightbulb,
  warn: AlertTriangle,
};

export default function Callout({ type, title, body }: Props) {
  const styles = STYLES[type];
  const Icon = ICON[type];

  return (
    <div
      className={`my-3 rounded-md border px-3.5 py-3 ${styles.container}`}
      role="note"
    >
      <div className="flex items-start gap-3">
        <div
          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${styles.iconBg}`}
          aria-hidden="true"
        >
          <Icon className={`h-4 w-4 ${styles.icon}`} />
        </div>
        <div className="min-w-0 flex-1">
          <div className={`mb-0.5 text-sm font-semibold ${styles.title}`}>{title}</div>
          <div className="text-sm leading-relaxed text-foreground/90 whitespace-pre-wrap">{body}</div>
        </div>
      </div>
    </div>
  );
}
