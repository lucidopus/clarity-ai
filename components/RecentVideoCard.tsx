interface RecentVideoCardProps {
  title: string;
  createdAt?: string | Date;
  onClick?: () => void;
}

export default function RecentVideoCard({ title, createdAt, onClick }: RecentVideoCardProps) {
  const formatTimeAgo = (date?: string | Date) => {
    if (!date) return '';
    const now = new Date();
    const past = new Date(date);
    const diffMs = now.getTime() - past.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return past.toLocaleDateString();
  };

  return (
    <button onClick={onClick} className="w-full text-left rounded-lg border border-border bg-card-bg p-3 hover:bg-accent/5 hover:border-accent/40 transition-colors cursor-pointer group">
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-foreground line-clamp-2 leading-tight">
            {title}
          </div>
          {createdAt && (
            <div className="text-xs text-muted-foreground mt-1">
              {formatTimeAgo(createdAt)}
            </div>
          )}
        </div>
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-muted-foreground group-hover:text-accent transition-colors flex-shrink-0 ml-2">
          <path fillRule="evenodd" d="M9.22 3.97a.75.75 0 0 1 1.06 0l7.25 7.25a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 1 1-1.06-1.06L15.94 12 9.22 5.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
        </svg>
      </div>
    </button>
  );
}
