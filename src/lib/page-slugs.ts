import "server-only";
import { and, eq, like, ne } from "drizzle-orm";
import { db } from "@/lib/db";
import { pages } from "@/lib/db/schema";
import { generateSlug } from "@/lib/utils";
import siteConfig from "@/lib/site.config";

/** Addresses the site itself uses, which a page can't take. */
const RESERVED = new Set([
  "admin",
  "api",
  "gallery",
  "map",
  "stories",
  "site-icon",
  siteConfig.labels.gallerySlug,
]);

/**
 * A free slug for a page or story, from `base` (a title or a typed address):
 * "about", else "about-2", "about-3", … Pages and stories share one namespace.
 */
export async function uniquePageSlug(base: string, excludeId?: string): Promise<string> {
  const slug = generateSlug(base) || "page";
  const taken = new Set(
    (
      await db
        .select({ slug: pages.slug })
        .from(pages)
        .where(excludeId ? and(like(pages.slug, `${slug}%`), ne(pages.id, excludeId)) : like(pages.slug, `${slug}%`))
    ).map((r) => r.slug),
  );
  RESERVED.forEach((r) => taken.add(r));
  if (!taken.has(slug)) return slug;
  for (let n = 2; ; n++) {
    if (!taken.has(`${slug}-${n}`)) return `${slug}-${n}`;
  }
}

/**
 * Checks an address typed in the admin. Returns the cleaned slug, or an error to show.
 * Unlike uniquePageSlug it never renames silently: a taken address is an error.
 */
export async function checkPageSlug(
  raw: string,
  id: string,
): Promise<{ slug: string; error?: undefined } | { slug?: undefined; error: string }> {
  const slug = generateSlug(raw);
  if (!slug) return { error: "The address needs at least one letter or number." };
  if (RESERVED.has(slug)) return { error: `"/${slug}" is used by the site itself. Choose another address.` };
  const [clash] = await db
    .select({ title: pages.title })
    .from(pages)
    .where(and(eq(pages.slug, slug), ne(pages.id, id)))
    .limit(1);
  if (clash) return { error: `"${clash.title}" already uses "/${slug}".` };
  return { slug };
}
