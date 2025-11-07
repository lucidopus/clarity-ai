export default function Loading() {
  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <div className="h-8 bg-secondary/20 rounded mb-2 animate-pulse w-48"></div>
        <div className="h-4 bg-secondary/20 rounded animate-pulse w-64"></div>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="flex-1">
          <div className="h-10 bg-card-bg border border-border rounded-lg animate-pulse"></div>
        </div>
        <div className="w-full sm:w-48">
          <div className="h-10 bg-card-bg border border-border rounded-lg animate-pulse"></div>
        </div>
      </div>

      {/* Video Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <div key={i} className="bg-card-bg rounded-xl border border-border overflow-hidden">
            {/* Thumbnail */}
            <div className="aspect-video bg-secondary/20 animate-pulse"></div>

            {/* Content */}
            <div className="p-4">
              <div className="h-5 bg-secondary/20 rounded mb-2 animate-pulse"></div>
              <div className="h-4 bg-secondary/20 rounded mb-3 animate-pulse w-3/4"></div>

              <div className="flex items-center justify-between text-sm">
                <div className="h-3 bg-secondary/20 rounded animate-pulse w-16"></div>
                <div className="h-3 bg-secondary/20 rounded animate-pulse w-12"></div>
              </div>

              <div className="flex items-center justify-between mt-3">
                <div className="h-6 bg-accent/20 rounded animate-pulse w-16"></div>
                <div className="h-8 w-8 bg-secondary/20 rounded animate-pulse"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}