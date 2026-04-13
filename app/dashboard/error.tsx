'use client';

import { useEffect } from 'react';

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Dashboard error:', error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="mx-auto max-w-md px-6 text-center">
        <h2 className="mb-2 text-xl font-semibold text-neutral-900 dark:text-neutral-100">
          Dashboard error
        </h2>
        <p className="mb-6 text-sm text-neutral-500 dark:text-neutral-400">
          Something went wrong loading this page. Your data is safe.
        </p>
        <button
          onClick={reset}
          className="rounded-lg bg-cyan-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-cyan-700"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
