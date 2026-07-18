// apps/web/next.config.js
const withSerwistInit = require('@serwist/next').default;

const withSerwist = withSerwistInit({
  swSrc: 'app/sw.ts', // We will create this
  swDest: 'public/sw.js',
  disable: process.env.NODE_ENV === 'development', // Disable in dev to avoid caching headaches
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone', // Required for our Phase 11 Dockerfile
  reactStrictMode: true,
};

module.exports = withSerwist(nextConfig);