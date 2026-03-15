import type { NextConfig } from "next";

const BACKEND_URL = process.env.BACKEND_URL || "https://stock-analyzer-phi-ten.vercel.app";

const nextConfig: NextConfig = {
  // Proxy /api/* to the Python backend
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${BACKEND_URL}/api/:path*`,
      },
    ];
  },
  // Add caching headers for API responses
  async headers() {
    return [
      {
        source: "/api/signals",
        headers: [
          {
            key: "Cache-Control",
            value: "public, s-maxage=300, stale-while-revalidate=600",
          },
        ],
      },
      {
        source: "/api/analyze/:ticker*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, s-maxage=300, stale-while-revalidate=600",
          },
        ],
      },
      {
        source: "/api/chart/:ticker*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, s-maxage=60, stale-while-revalidate=120",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
