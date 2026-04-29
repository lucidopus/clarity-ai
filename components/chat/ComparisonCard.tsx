'use client';

import type { ComparisonSpec } from '@/lib/types/visualization';

type Props = ComparisonSpec;

export default function ComparisonCard({ left, right }: Props) {
  return (
    <div className="my-3 grid gap-3 md:grid-cols-2">
      {[left, right].map((column, i) => (
        <div
          key={i}
          className="rounded-md border border-border/40 bg-card-bg/40 p-3.5"
        >
          <div className="mb-2 text-sm font-semibold text-foreground">
            {column.title}
          </div>
          <ul className="space-y-1.5 text-sm leading-relaxed text-foreground/85">
            {column.items.map((item, j) => (
              <li key={j} className="flex gap-2">
                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-accent/60" aria-hidden="true" />
                <span className="min-w-0 flex-1">{item}</span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
