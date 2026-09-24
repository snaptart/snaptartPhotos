import "server-only";
import { cache } from "react";
import { asc, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { galleries, menuItems, pages, siteSettings, themes } from "@/lib/db/schema";
import { resolveTheme, type ThemeSettings } from "@/lib/theme/types";
import { builtCollectionPages } from "@/lib/collections";
import siteConfig from "@/lib/site.config";

export type ChromeMenuItem = {
  id: string;
  label: string;
  url: string;
  targetType: string;
  /** Paths (besides its own) where this item is the current section. */
  sectionPaths: string[];
};

export type SiteChrome = {
  items: ChromeMenuItem[];
  settings: typeof siteSettings.$inferSelect | null;
  theme: ThemeSettings;
};

/**
 * What the header and footer both need, read once per request.
 *
 * A menu item that leads to a page with a Gallery Index (the collections page)
 * also counts as current on every collection page, so it stays underlined
 * while a visitor is inside a collection.
 */
export const loadSiteChrome = cache(async (): Promise<SiteChrome> => {
  let items: ChromeMenuItem[] = [];
  let settings: SiteChrome["settings"] = null;
  let theme = resolveTheme();

  try {
    const [rows, settingsRows] = await Promise.all([
      db.select().from(menuItems).orderBy(asc(menuItems.position)),
      db.select().from(siteSettings).limit(1),
    ]);
    settings = settingsRows[0] ?? null;
    if (settings?.activeThemeId) {
      const themeRows = await db.select().from(themes).where(eq(themes.id, settings.activeThemeId)).limit(1);
      if (themeRows[0]) theme = resolveTheme(themeRows[0].themeSettings as Record<string, unknown>);
    }

    const pageIds = rows.filter((r) => r.targetType === "page" && r.targetId).map((r) => r.targetId as string);
    const indexPages = new Set<string>();
    if (pageIds.length) {
      const targets = await db.select({ id: pages.id, content: pages.content }).from(pages).where(inArray(pages.id, pageIds));
      for (const t of targets) {
        if (JSON.stringify(t.content ?? "").includes('"type":"GalleriesIndex"')) indexPages.add(t.id);
      }
    }

    let collectionPaths: string[] = [];
    if (indexPages.size) {
      const published = await db
        .select({ slug: galleries.slug })
        .from(galleries)
        .where(eq(galleries.isPublished, true));
      const slugs = published.map((g) => g.slug);
      const built = await builtCollectionPages(slugs);
      collectionPaths = [
        `/${siteConfig.labels.gallerySlug}`,
        ...slugs.filter((s) => built.has(s)).map((s) => `/${s}`),
      ];
    }

    items = rows.map((r) => ({
      id: r.id,
      label: r.label,
      url: r.url,
      targetType: r.targetType,
      sectionPaths: r.targetId && indexPages.has(r.targetId) ? collectionPaths : [],
    }));
  } catch {
    // DB not available — the header and footer fall back to the site name.
  }

  return { items, settings, theme };
});
