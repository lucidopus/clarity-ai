export default function Loading() {
  return (
    <div>
      {/* Page Header */}
      <div className="mb-8">
        <div className="h-8 bg-secondary/20 rounded mb-2 animate-pulse w-24"></div>
        <div className="h-4 bg-secondary/20 rounded animate-pulse w-64"></div>
      </div>

      {/* Account Information Section */}
      <div className="bg-card-bg rounded-2xl p-6 border border-border mb-6">
        <div className="h-6 bg-secondary/20 rounded mb-6 animate-pulse w-40"></div>
        <div className="space-y-4">
          <div>
            <div className="h-4 bg-secondary/20 rounded mb-2 animate-pulse w-16"></div>
            <div className="h-10 bg-background border border-border rounded-lg animate-pulse"></div>
          </div>
          <div>
            <div className="h-4 bg-secondary/20 rounded mb-2 animate-pulse w-12"></div>
            <div className="h-10 bg-background border border-border rounded-lg animate-pulse"></div>
          </div>
          <div>
            <div className="h-4 bg-secondary/20 rounded mb-2 animate-pulse w-20"></div>
            <div className="h-10 bg-background border border-border rounded-lg animate-pulse"></div>
          </div>
        </div>
      </div>

      {/* Preferences Section */}
      <div className="bg-card-bg rounded-2xl p-6 border border-border mb-6">
        <div className="h-6 bg-secondary/20 rounded mb-6 animate-pulse w-32"></div>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="h-4 bg-secondary/20 rounded mb-1 animate-pulse w-24"></div>
              <div className="h-3 bg-secondary/20 rounded animate-pulse w-48"></div>
            </div>
            <div className="w-12 h-6 bg-accent/20 rounded-full animate-pulse"></div>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <div className="h-4 bg-secondary/20 rounded mb-1 animate-pulse w-28"></div>
              <div className="h-3 bg-secondary/20 rounded animate-pulse w-52"></div>
            </div>
            <div className="w-12 h-6 bg-accent/20 rounded-full animate-pulse"></div>
          </div>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="bg-red-50 dark:bg-red-950/20 rounded-2xl p-6 border border-red-200 dark:border-red-800">
        <div className="h-6 bg-red-200 dark:bg-red-800/20 rounded mb-4 animate-pulse w-24"></div>
        <div className="h-4 bg-red-200 dark:bg-red-800/20 rounded mb-4 animate-pulse w-64"></div>
        <div className="h-10 bg-red-500/20 rounded-lg animate-pulse w-32"></div>
      </div>
    </div>
  );
}