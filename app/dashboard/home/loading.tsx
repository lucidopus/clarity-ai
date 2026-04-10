export default function Loading() {
  return (
    <div className="space-y-5">
      {/* Row 1: Clarity Score + Activity Heatmap */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Clarity Score skeleton */}
        <div className="bg-card-bg border border-border rounded-2xl p-5 animate-pulse">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-secondary/20" />
              <div className="h-4 w-28 rounded bg-secondary/20" />
            </div>
            <div className="h-5 w-24 rounded-full bg-secondary/20" />
          </div>
          <div className="flex items-center gap-5">
            <div className="w-20 h-20 rounded-full bg-secondary/20 shrink-0" />
            <div className="flex-1 space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i}>
                  <div className="flex justify-between mb-1.5">
                    <div className="h-3 w-32 rounded bg-secondary/20" />
                    <div className="h-3 w-12 rounded bg-secondary/20" />
                  </div>
                  <div className="h-1.5 rounded-full bg-secondary/10" />
                </div>
              ))}
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-border/50 flex justify-between">
            <div className="h-3 w-24 rounded bg-secondary/10" />
            <div className="h-3 w-32 rounded bg-secondary/10" />
          </div>
        </div>

        {/* Heatmap skeleton */}
        <div className="bg-card-bg border border-border rounded-2xl p-6 animate-pulse">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-secondary/20" />
            <div className="h-4 w-36 rounded bg-secondary/20" />
          </div>
          <div className="grid grid-cols-[repeat(18,1fr)] gap-1 mb-3">
            {Array.from({ length: 126 }).map((_, i) => (
              <div key={i} className="aspect-square bg-secondary/10 rounded-sm" />
            ))}
          </div>
          <div className="flex justify-between">
            <div className="h-3 w-20 rounded bg-secondary/10" />
            <div className="h-3 w-20 rounded bg-secondary/10" />
          </div>
        </div>
      </div>

      {/* Row 2: Smart Review + Streak + Daily Challenges */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* CardsDue skeleton */}
        <div className="bg-card-bg border border-border rounded-2xl p-5 animate-pulse">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-secondary/20" />
              <div className="h-4 w-24 rounded bg-secondary/20" />
            </div>
            <div className="h-5 w-16 rounded-full bg-secondary/20" />
          </div>
          <div className="h-11 rounded-xl bg-secondary/20 mb-2" />
          <div className="h-10 rounded-xl bg-secondary/10 mb-4" />
          <div className="grid grid-cols-3 gap-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="text-center">
                <div className="h-4 w-8 rounded bg-secondary/20 mx-auto mb-1" />
                <div className="h-3 w-16 rounded bg-secondary/10 mx-auto" />
              </div>
            ))}
          </div>
        </div>

        {/* Streak skeleton */}
        <div className="bg-card-bg border border-border rounded-2xl p-5 animate-pulse">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-secondary/20" />
              <div className="h-4 w-24 rounded bg-secondary/20" />
            </div>
            <div className="h-5 w-20 rounded-full bg-secondary/20" />
          </div>
          <div className="h-12 rounded-xl bg-secondary/20 mb-4" />
          <div className="h-2 rounded-full bg-secondary/20" />
        </div>

        {/* Daily Challenges skeleton */}
        <div className="bg-card-bg border border-border rounded-2xl p-5 animate-pulse">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-secondary/20" />
            <div className="h-4 w-32 rounded bg-secondary/20" />
          </div>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full bg-secondary/20" />
                <div className="flex-1 h-4 rounded bg-secondary/20" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Knowledge Map skeleton */}
      <div className="bg-card-bg border border-border rounded-2xl p-5 animate-pulse">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-8 h-8 rounded-lg bg-secondary/20" />
          <div className="h-4 w-36 rounded bg-secondary/20" />
        </div>
        <div className="h-3 w-48 rounded bg-secondary/10 mb-4 ml-10" />
        <div className="space-y-3">
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

      {/* Weekly Rhythm skeleton */}
      <div className="bg-card-bg border border-border rounded-2xl p-6 animate-pulse">
        <div className="h-5 w-32 rounded bg-secondary/20 mb-4" />
        <div className="h-[140px] bg-secondary/10 rounded" />
      </div>

      {/* Learning Insights skeleton */}
      <div>
        <div className="h-6 w-40 rounded bg-secondary/20 mb-3 animate-pulse" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-card-bg border border-border rounded-2xl p-6 animate-pulse">
              <div className="h-5 w-36 rounded bg-secondary/20 mb-4" />
              <div className="h-[160px] bg-secondary/10 rounded" />
            </div>
          ))}
        </div>
      </div>

      {/* Recent Activity skeleton */}
      <div>
        <div className="h-6 w-36 rounded bg-secondary/20 mb-3 animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="bg-card-bg rounded-xl border border-border p-4 animate-pulse">
              <div className="aspect-video bg-secondary/20 rounded-lg mb-3" />
              <div className="h-4 bg-secondary/20 rounded mb-2" />
              <div className="h-3 bg-secondary/10 rounded w-16" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
