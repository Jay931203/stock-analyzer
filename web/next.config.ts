import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: "https://stock-analyzer-phi-ten.vercel.app/api/:path*",
      },
    ];
  },
};

export default nextConfig;
