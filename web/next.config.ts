import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // In production: /api/* routes are handled by Python backend via vercel.json
  // In development: proxy to production API
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
