import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Stub Node.js built-ins that manim-web's opentype.js dependency references
  // (they are only used in Node.js font-loading paths, never in the browser)
  turbopack: {
    resolveAlias: {
      fs: { browser: './lib/stubs/empty.js' },
    },
  },
  async headers() {
    const csp = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'", // unsafe-inline for Next.js streaming hydration, unsafe-eval for React dev mode
      "style-src 'self' 'unsafe-inline'",      // Tailwind + dynamic styles
      "img-src 'self' data: blob: https://i.ytimg.com https://img.youtube.com https://images.unsplash.com https://via.placeholder.com https://*.supabase.co",
      "font-src 'self'",
      "connect-src 'self' https://*.supabase.co",
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
