/** @type {import('next').NextConfig} */
const nextConfig = {
  compiler: {
    // Keep console logs in production for debugging
    // This is a single-user proprietary app, so performance impact is negligible
    // and having logs available helps with troubleshooting
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