'use client';

import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Unhandled error:', error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-white dark:bg-neutral-950">
      <div className="mx-auto max-w-md px-6 text-center">
        <h2 className="mb-2 text-2xl font-semibold text-neutral-900 dark:text-neutral-100">
          Something went wrong
        </h2>
        <p className="mb-6 text-neutral-500 dark:text-neutral-400">
          An unexpected error occurred. Please try again.
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
