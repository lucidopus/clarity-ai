interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  trend?: {
    value: string;
    isPositive: boolean;
  };
  className?: string;
}

export default function StatCard({ icon, label, value, trend, className = '' }: StatCardProps) {
  return (
    <div
      className={`bg-card-bg border border-border rounded-lg p-6 hover:border-accent/50 transition-all duration-200 ${className}`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center space-x-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center text-accent">
              {icon}
            </div>
          </div>
          <p className="text-sm text-muted-foreground mb-1">{label}</p>
          <p className="text-3xl font-bold text-foreground">{value}</p>
          {trend && (
            <div className="mt-2 flex items-center space-x-1">
              <span
                className={`text-sm font-medium ${
                  trend.isPositive ? 'text-green-500' : 'text-red-500'
                }`}
              >
                {trend.isPositive ? '↑' : '↓'} {trend.value}
              </span>
              <span className="text-sm text-muted-foreground">from last week</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
