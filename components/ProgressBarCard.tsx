interface ProgressBarCardProps {
  title: string;
  percentage: number; // 0-100
  subtitle?: string;
}

export default function ProgressBarCard({ title, percentage, subtitle }: ProgressBarCardProps) {
  const pct = Math.max(0, Math.min(100, Math.round(percentage)));
  return (
    <div className="bg-card-bg border border-border rounded-2xl p-5">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground">{title}</h3>
        <span className="text-sm text-muted-foreground">{pct}%</span>
      </div>
      {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
      <div className="mt-4">
        <div className="w-full h-2.5 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
          <div
            className="h-full bg-accent transition-[width] duration-500 ease-out"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    </div>
  );
}
