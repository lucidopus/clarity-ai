export default function Loading() {
  return (
    <div className="space-y-8">
      {/* Stats Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-card-bg rounded-xl border border-border p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="h-4 bg-secondary/20 rounded mb-2 animate-pulse w-16"></div>
                <div className="h-8 bg-secondary/20 rounded mb-1 animate-pulse w-12"></div>
                <div className="h-3 bg-accent/20 rounded animate-pulse w-20"></div>
              </div>
              <div className="w-10 h-10 bg-accent/20 rounded-lg animate-pulse"></div>
            </div>
          </div>
        ))}
      </div>

      {/* Heatmap + Weekly Chart */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2">
          <div className="bg-card-bg rounded-xl border border-border p-6">
            <div className="h-6 bg-secondary/20 rounded mb-4 animate-pulse w-48"></div>
            <div className="grid grid-cols-7 gap-1 mb-4">
              {Array.from({ length: 35 }).map((_, i) => (
                <div key={i} className="aspect-square bg-secondary/10 rounded animate-pulse"></div>
              ))}
            </div>
            <div className="flex justify-between text-xs">
              <div className="h-3 bg-secondary/20 rounded animate-pulse w-8"></div>
              <div className="h-3 bg-secondary/20 rounded animate-pulse w-12"></div>
              <div className="h-3 bg-secondary/20 rounded animate-pulse w-8"></div>
            </div>
          </div>
        </div>
        <div className="h-full">
          <div className="bg-card-bg rounded-xl border border-border p-6 h-full">
            <div className="h-6 bg-secondary/20 rounded mb-4 animate-pulse w-40"></div>
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="h-4 bg-secondary/20 rounded animate-pulse w-20"></div>
                  <div className="h-4 bg-accent/20 rounded animate-pulse w-8"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div>
        <div className="h-6 bg-secondary/20 rounded mb-3 animate-pulse w-32"></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="bg-card-bg rounded-xl border border-border p-4">
              <div className="aspect-video bg-secondary/20 rounded-lg mb-3 animate-pulse"></div>
              <div className="h-4 bg-secondary/20 rounded mb-2 animate-pulse"></div>
              <div className="h-3 bg-secondary/20 rounded animate-pulse w-16"></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}