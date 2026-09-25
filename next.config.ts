import type { NextConfig } from "next";
import siteConfig from "./src/lib/site.config";

const nextConfig: NextConfig = {
  // Lets a phone on the home network use `next dev` (scripts and hot reload); dev-only.
  allowedDevOrigins: ["192.168.50.17"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.public.blob.vercel-storage.com",
      },
    ],
  },
  async rewrites() {
    // Per-site rewrites live in site.config.ts, so a site can add its own without
    // editing this file.
    return siteConfig.rewrites;
  },
};

export default nextConfig;
