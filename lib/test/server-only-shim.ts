// Jest shim for Next.js's `server-only` package. The real package throws if
// it's imported into a client bundle; in tests we don't care, so this is a
// deliberate no-op.
export {};
