interface MotivationBannerProps {
  message: string;
}

export default function MotivationBanner({ message }: MotivationBannerProps) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-border bg-card-bg">
      <div className="absolute inset-0 pointer-events-none opacity-60 dark:opacity-40" style={{
        background: 'linear-gradient(90deg, rgba(6,182,212,0.12) 0%, rgba(6,182,212,0.04) 100%)'
      }} />
      <div className="flex items-center gap-3 p-5">
        <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-accent/15 text-accent">💪</div>
        <p className="text-sm text-foreground">{message}</p>
      </div>
      <div className="absolute left-0 top-0 h-full w-1 bg-accent" />
    </div>
  );
}
