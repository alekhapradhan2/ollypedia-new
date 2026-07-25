/** @type {import('next').NextConfig} */
const nextConfig = {
  cacheMaxMemorySize: 0, // Disable in-memory cache entirely, forcing disk cache to prevent RAM exhaustion on Hostinger (512MB)
  experimental: {
    instrumentationHook: true, // remove if you're on Next.js 15+
  },

  images: {
    unoptimized: true,         // Disable server-side image optimization to prevent RAM spikes from 'sharp'
    remotePatterns: [
      { protocol: "https", hostname: "**" },
      { protocol: "http", hostname: "**" },
    ],
    dangerouslyAllowSVG: true,
    contentDispositionType: "attachment",
    contentSecurityPolicy:
      "default-src 'self'; script-src 'none'; sandbox;",
  },

  eslint: {
    ignoreDuringBuilds: true,
  },

  async redirects() {
    return [
      // Redirect non-www → www (permanent 301)
      {
        source: "/:path*",
        has: [{ type: "host", value: "ollypedia.in" }],
        destination: "https://www.ollypedia.in/:path*",
        permanent: true,
      },
    ];
  },

  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;