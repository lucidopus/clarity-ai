export default function Loading() {
  return (
    <main className="min-h-screen">
      {/* Hero Section Skeleton */}
      <section className="relative overflow-hidden opacity-100 transition-opacity duration-700 h-screen flex items-center">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-4xl mx-auto">
            <div className="h-16 bg-secondary/20 rounded-lg mb-6 animate-pulse"></div>
            <div className="h-6 bg-secondary/20 rounded mb-8 animate-pulse max-w-3xl mx-auto"></div>
            <div className="flex flex-col mb-15 sm:flex-row gap-4 justify-center items-center">
              <div className="h-12 bg-accent/20 rounded-lg w-40 animate-pulse"></div>
              <div className="h-12 bg-secondary/20 rounded-lg w-32 animate-pulse"></div>
            </div>
          </div>
        </div>
      </section>

      {/* About Section Skeleton */}
      <section className="py-20 bg-linear-to-br from-background via-card-bg/20 to-background relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="max-w-6xl mx-auto">
            {/* Story Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-20">
              <div className="space-y-6">
                <div className="h-12 bg-secondary/20 rounded-lg animate-pulse"></div>
                <div className="h-4 bg-secondary/20 rounded animate-pulse"></div>
                <div className="h-4 bg-secondary/20 rounded animate-pulse"></div>
              </div>
              <div className="relative">
                <div className="bg-card-bg/50 backdrop-blur-sm rounded-2xl p-8 border border-accent/10 shadow-xl">
                  <div className="space-y-6">
                    <div className="w-16 h-16 bg-accent/20 rounded-full animate-pulse"></div>
                    <div>
                      <div className="h-6 bg-secondary/20 rounded mb-3 animate-pulse"></div>
                      <div className="h-4 bg-secondary/20 rounded mb-4 animate-pulse"></div>
                      <div className="h-4 bg-accent/20 rounded animate-pulse w-32"></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Values Section */}
            <div className="mb-20">
              <div className="text-center mb-12">
                <div className="h-8 bg-secondary/20 rounded mb-4 animate-pulse"></div>
                <div className="h-4 bg-secondary/20 rounded animate-pulse max-w-2xl mx-auto"></div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="text-center p-8">
                    <div className="w-16 h-16 bg-accent/10 rounded-xl mx-auto mb-6 animate-pulse"></div>
                    <div className="h-6 bg-secondary/20 rounded mb-3 animate-pulse"></div>
                    <div className="h-4 bg-secondary/20 rounded mb-2 animate-pulse"></div>
                    <div className="h-4 bg-secondary/20 rounded animate-pulse"></div>
                  </div>
                ))}
              </div>
            </div>

            {/* Impact Stats */}
            <div className="mb-16">
              <div className="text-center mb-12">
                <div className="h-8 bg-secondary/20 rounded mb-4 animate-pulse"></div>
                <div className="h-4 bg-secondary/20 rounded animate-pulse max-w-2xl mx-auto"></div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="text-center p-6">
                    <div className="w-14 h-14 bg-accent/10 rounded-xl mx-auto mb-4 animate-pulse"></div>
                    <div className="h-8 bg-accent/20 rounded mb-2 animate-pulse"></div>
                    <div className="h-4 bg-secondary/20 rounded mb-1 animate-pulse"></div>
                    <div className="h-3 bg-secondary/20 rounded animate-pulse"></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section Skeleton */}
      <section className="py-20 bg-card-bg/30 relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center mb-12">
            <div className="h-8 bg-secondary/20 rounded mb-4 animate-pulse"></div>
            <div className="h-4 bg-secondary/20 rounded animate-pulse max-w-2xl mx-auto"></div>
          </div>

          <div className="relative max-w-6xl mx-auto">
            <div className="grid grid-cols-2 gap-8 relative z-10">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="bg-background rounded-2xl p-6 border border-accent/60 shadow-lg">
                  <div className="flex items-start space-x-4">
                    <div className="shrink-0">
                      <div className="w-14 h-14 bg-accent/20 rounded-xl animate-pulse"></div>
                    </div>
                    <div className="flex-1">
                      <div className="h-5 bg-accent/20 rounded mb-2 animate-pulse"></div>
                      <div className="h-4 bg-secondary/20 rounded mb-3 animate-pulse"></div>
                      <div className="h-4 bg-accent/20 rounded animate-pulse w-32"></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section Skeleton */}
      <section className="py-20 relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center mb-12">
            <div className="h-8 bg-secondary/20 rounded mb-4 animate-pulse"></div>
            <div className="h-4 bg-secondary/20 rounded animate-pulse max-w-2xl mx-auto"></div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {[1, 2, 3].map((i) => (
              <div key={i} className="text-center">
                <div className="w-16 h-16 bg-accent/20 rounded-full mx-auto mb-4 animate-pulse"></div>
                <div className="h-5 bg-secondary/20 rounded mb-2 animate-pulse"></div>
                <div className="h-4 bg-secondary/20 rounded animate-pulse"></div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section Skeleton */}
      <section className="py-20 bg-card-bg/30 relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center mb-12">
            <div className="h-8 bg-secondary/20 rounded mb-4 animate-pulse"></div>
            <div className="h-4 bg-secondary/20 rounded animate-pulse max-w-2xl mx-auto"></div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {[1, 2, 3].map((i) => (
              <div key={i} className="text-center p-8">
                <div className="mb-6">
                  <div className="h-6 bg-secondary/20 rounded mb-2 animate-pulse"></div>
                  <div className="h-8 bg-accent/20 rounded mb-2 animate-pulse"></div>
                  <div className="h-4 bg-secondary/20 rounded animate-pulse"></div>
                </div>
                <div className="space-y-3 mb-6">
                  {[1, 2, 3, 4, 5].map((j) => (
                    <div key={j} className="flex items-center">
                      <div className="w-5 h-5 bg-accent/20 rounded mr-2 animate-pulse"></div>
                      <div className="h-4 bg-secondary/20 rounded animate-pulse flex-1"></div>
                    </div>
                  ))}
                </div>
                <div className="h-10 bg-accent/20 rounded animate-pulse"></div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section Skeleton */}
      <section className="py-20 relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="max-w-4xl mx-auto">
            <div className="bg-background/80 backdrop-blur-sm rounded-3xl p-8 md:p-12 text-center border border-accent/20 shadow-2xl">
              <div className="h-12 bg-secondary/20 rounded mb-6 animate-pulse"></div>
              <div className="h-6 bg-secondary/20 rounded mb-8 animate-pulse max-w-2xl mx-auto"></div>
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-6">
                <div className="h-12 bg-accent/20 rounded w-40 animate-pulse"></div>
                <div className="h-12 bg-secondary/20 rounded w-32 animate-pulse"></div>
              </div>
              <div className="h-4 bg-secondary/20 rounded animate-pulse"></div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}