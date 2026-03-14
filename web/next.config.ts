import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // API calls go to /api/* which Vercel routes to Python backend via vercel.json
  // No rewrites needed in production (same origin)
  // For local dev, use rewrites to proxy to the production API
  async rewrites() {
    if (process.env.NODE_ENV === "development") {
      return [
        {
          source: "/api/:path*",
          destination: "https://stock-analyzer-phi-ten.vercel.app/api/:path*",
        },
      ];
    }
    return [];
  },
};

export default nextConfig;
