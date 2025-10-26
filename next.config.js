/** @type {import('next').NextConfig} */
const nextConfig = {
  compiler: {
    // Temporarily keep console logs in production for debugging
    // Remove console logs in production for performance and cleaner browser console
    // removeConsole: process.env.NODE_ENV === 'production' ? {
    //   exclude: ['error'], // Keep console.error for debugging critical issues
    // } : false,
  },
  images: {
    domains: [],
  },
  async headers() {
    return [
      {
        source: '/sw.js',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=0, must-revalidate',
          },
          {
            key: 'Service-Worker-Allowed',
            value: '/',
          },
        ],
      },
      {
        source: '/site.webmanifest',
        headers: [
          {
            key: 'Content-Type',
            value: 'application/manifest+json',
          },
        ],
      },
    ];
  },
}

module.exports = nextConfig