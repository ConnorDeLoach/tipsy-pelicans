import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Extend client-side Router Cache duration for faster back/forward navigation
  experimental: {
    staleTimes: {
      // Cache dynamic pages for 3 minutes (default is 0)
      dynamic: 180,
      // Cache static pages for 5 minutes (default is 5 min)
      static: 300,
    },
  },
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [{ key: "Cache-Control", value: "no-store" }],
      },
      {
        // If you later add a static manifest
        source: "/manifest.webmanifest",
        headers: [{ key: "Cache-Control", value: "no-store" }],
      },
    ];
  },
};

export default nextConfig;
