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
};

export default nextConfig;
