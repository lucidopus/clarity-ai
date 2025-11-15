export default function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="bg-card-bg rounded-xl border border-border w-full max-w-md p-8">
        <div className="text-center mb-8">
          <div className="h-6 bg-secondary/20 rounded mb-2 animate-pulse"></div>
        </div>

        <div className="space-y-4 flex flex-col">
          <div>
            <div className="h-4 bg-secondary/20 rounded mb-1 animate-pulse w-16"></div>
            <div className="h-10 bg-background border border-border rounded-lg animate-pulse"></div>
          </div>

          <div>
            <div className="h-4 bg-secondary/20 rounded mb-1 animate-pulse w-16"></div>
            <div className="h-10 bg-background border border-border rounded-lg animate-pulse"></div>
          </div>

          <div className="flex items-center">
            <div className="h-4 w-4 bg-accent/20 rounded animate-pulse mr-2"></div>
            <div className="h-4 bg-secondary/20 rounded animate-pulse w-20"></div>
          </div>

          <div className="h-10 bg-accent/20 rounded-lg animate-pulse"></div>
        </div>

        <div className="mt-6 text-center">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-sm">
              <div className="h-4 bg-secondary/20 rounded animate-pulse w-24"></div>
            </div>
          </div>

          <div className="mt-6">
            <div className="h-10 bg-background border border-border rounded-lg animate-pulse"></div>
          </div>
        </div>

        <div className="mt-6 text-center">
          <div className="h-4 bg-secondary/20 rounded animate-pulse w-48"></div>
        </div>
      </div>
    </div>
  );
}