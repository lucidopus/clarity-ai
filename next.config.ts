import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // LAN hosts allowed to hit Next's dev HMR/assets — needed for testing the
  // mobile layout on a phone over the local network. Dev-only; prod ignores.
  allowedDevOrigins: ['10.0.0.11'],
  // Stub Node.js built-ins that manim-web's opentype.js dependency references
  // (they are only used in Node.js font-loading paths, never in the browser)
  turbopack: {
    resolveAlias: {
      fs: { browser: './lib/stubs/empty.js' },
    },
  },
  async headers() {
    const isDev = process.env.NODE_ENV !== 'production';
    // Dev-only: allow HMR WebSocket + inline eval for Turbopack/Webpack dev
    // runtime. Without this, iOS Safari throws `SecurityError: The operation
    // is insecure` when the HMR socket is blocked by CSP, which escapes as
    // an unhandled promise rejection and kills React hydration.
    const connectExtras = isDev ? " ws: wss: http: https:" : "";
    const csp = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.youtube.com https://s.ytimg.com", // unsafe-inline for Next.js streaming hydration, unsafe-eval for React dev mode; YouTube hosts for IFrame Player API
      "style-src 'self' 'unsafe-inline'",      // Tailwind + dynamic styles
      "img-src 'self' data: blob: https://i.ytimg.com https://img.youtube.com https://images.unsplash.com https://via.placeholder.com https://*.supabase.co",
      "font-src 'self'",
      `connect-src 'self' https://*.supabase.co${connectExtras}`,
      "frame-src https://www.youtube.com",
      "media-src 'self' blob: https://*.supabase.co",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join('; ');

    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(self), geolocation=()' },
          { key: 'Content-Security-Policy', value: csp },
        ],
      },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'via.placeholder.com',
      },
      {
        protocol: 'https',
        hostname: 'i.ytimg.com',
      },
      {
        protocol: 'https',
        hostname: 'img.youtube.com',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
    ],
  },
};

export default nextConfig;
