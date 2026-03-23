import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Stub Node.js built-ins that manim-web's opentype.js dependency references
  // (they are only used in Node.js font-loading paths, never in the browser)
  turbopack: {
    resolveAlias: {
      fs: { browser: './lib/stubs/empty.js' },
    },
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
