/**
 * Per-site configuration overrides for snaptart.com.
 *
 * This file is OWNED BY THE SITE. The CMS repo shipped it once as a stub and
 * never modifies it again, so merging upstream will not conflict with the
 * customizations below; anything omitted falls back to the upstream defaults
 * in `site.config.defaults.ts` (which sites should never edit).
 */

import { defineSiteConfig } from "./site.config.defaults";

export type { SiteConfig } from "./site.config.defaults";

const siteConfig = defineSiteConfig({
  features: {
    fieldMap: true,
  },
  rewrites: [
    // The 2026 France/Italy trip journal is a separate Expo app (apps/trip-map), exported
    // to public/2026-france-and-italy by its own `npm run build:site`. Everything under
    // that path is served straight off disk; only the bare path needs help, since the
    // directory itself is not a file — what is wanted there is the app's index.html.
    // (A trailing slash needs no rule: Next redirects /path/ to /path before rewrites.)
    { source: "/2026-france-and-italy", destination: "/2026-france-and-italy/index.html" },
  ],
});

export default siteConfig;
