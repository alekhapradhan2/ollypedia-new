/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    instrumentationHook: true, // remove if you're on Next.js 15+
  },

  images: {
    // unoptimized removed — enable Next.js automatic WebP/AVIF conversion
    // for better Core Web Vitals (was serving full-size images before)
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