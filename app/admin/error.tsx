'use client';

import { useEffect } from 'react';
import { AlertCircle } from 'lucide-react';

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Admin portal error:', error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="mx-auto max-w-lg text-center">
        <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-accent/10">
          <AlertCircle className="h-6 w-6 text-accent" aria-hidden="true" />
        </div>
        <h2 className="mb-2 text-xl font-semibold text-foreground">
          Admin portal error
        </h2>
        <p className="mb-2 text-sm text-secondary">
          Something went wrong loading this admin view.
        </p>
        {error?.digest ? (
          <p className="mb-6 text-xs text-secondary">
            Error ref: <code className="font-mono">{error.digest}</code>
          </p>
        ) : (
          <div className="mb-6" />
        )}
        <button
          onClick={reset}
          className="rounded-lg bg-accent px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-accent-hover focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-background"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
