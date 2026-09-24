import "server-only";
import { and, eq, inArray, ne } from "drizzle-orm";
import { db } from "@/lib/db";
import { pages } from "@/lib/db/schema";
import siteConfig from "@/lib/site.config";

/**
 * Where a collection lives. Collection pages are built by hand in the page
 * editor, and a built page takes the collection's slug (France → /france).
 * When a published page has the slug, links go there; otherwise to the
 * automatic /gallery/<slug> page, which stays the fallback.
 */

/** The collection slugs that have a published page of their own. */
export async function builtCollectionPages(slugs: string[]): Promise<Set<string>> {
  if (slugs.length === 0) return new Set();
  const rows = await db
    .select({ slug: pages.slug })
    .from(pages)
    // Stories are pages too, but they live under /stories.
    .where(and(inArray(pages.slug, slugs), eq(pages.isPublished, true), ne(pages.pageType, "story")));
  return new Set(rows.map((r) => r.slug));
}

export function collectionHref(slug: string, built: Set<string>): string {
  return built.has(slug) ? `/${slug}` : `/${siteConfig.labels.gallerySlug}/${slug}`;
}
