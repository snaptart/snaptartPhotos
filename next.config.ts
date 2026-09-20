import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.public.blob.vercel-storage.com",
      },
    ],
  },
  async rewrites() {
    return [
      // The 2026 France/Italy trip journal is a separate Expo app (apps/trip-map), exported
      // to public/2026-france-and-italy by its own `npm run build:site`. Everything under
      // that path is served straight off disk; only the bare path needs help, since the
      // directory itself is not a file — what is wanted there is the app's index.html.
      // (A trailing slash needs no rule: Next redirects /path/ to /path before rewrites.)
      { source: "/2026-france-and-italy", destination: "/2026-france-and-italy/index.html" },
    ];
  },
};

export default nextConfig;
