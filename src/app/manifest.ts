import type { MetadataRoute } from "next";
import { loadSiteIconSettings } from "@/lib/site-icon";
import siteConfig from "@/lib/site.config";

export const dynamic = "force-dynamic";

// Lets phones add the site to the home screen with its own name and icon.
export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const s = await loadSiteIconSettings();
  return {
    name: s.siteTitle,
    short_name: s.siteTitle,
    description: siteConfig.siteDescription,
    start_url: "/",
    display: "minimal-ui",
    background_color: s.background,
    theme_color: s.background,
    icons: [
      { src: `/site-icon/icon-192.png?v=${s.version}`, sizes: "192x192", type: "image/png" },
      { src: `/site-icon/icon-512.png?v=${s.version}`, sizes: "512x512", type: "image/png" },
    ],
  };
}
