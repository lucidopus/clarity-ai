'use client';

import { useEffect } from 'react';

/**
 * Next.js global-error boundary — catches crashes in the root layout itself
 * (e.g., auth provider, theme provider, MongoDB context) that `app/error.tsx`
 * cannot catch. Must render its own `<html>` and `<body>` because it replaces
 * the root layout when active.
 *
 * Intentionally uses inline styles instead of Tailwind classes: if the root
 * layout crashed, global CSS may not have loaded either.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Global root error:', error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#0F172A',
          color: '#F9FAFB',
          fontFamily:
            "system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
          padding: '1rem',
        }}
      >
        <div style={{ maxWidth: 480, textAlign: 'center' }}>
          <div
            style={{
              margin: '0 auto 1.25rem',
              width: 56,
              height: 56,
              borderRadius: '50%',
              backgroundColor: 'rgba(6, 182, 212, 0.12)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 28,
            }}
            aria-hidden="true"
          >
            <span style={{ color: '#06B6D4' }}>!</span>
          </div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '0.75rem' }}>
            Something went wrong
          </h1>
          <p style={{ color: '#94A3B8', marginBottom: '1.5rem', lineHeight: 1.6 }}>
            We hit an unexpected error. Please try again, and if it keeps happening, refresh the page.
          </p>
          <button
            onClick={reset}
            style={{
              backgroundColor: '#06B6D4',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: 8,
              padding: '0.625rem 1.25rem',
              fontSize: '0.875rem',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
