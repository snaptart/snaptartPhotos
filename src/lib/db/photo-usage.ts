import "server-only";
import { db } from "./index";
import { galleryPhotos, pages, photos } from "./schema";
import { count } from "drizzle-orm";
import { STORIES_INDEX_TYPE } from "@/lib/stories/constants";

export type PhotoPageUse = {
  id: string;
  title: string;
  kind: "page" | "story";
  /** The admin editor for that page or story. */
  editHref: string;
};

export type PhotoUsage = { galleryCount: number; pages: PhotoPageUse[] };

const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;
const URL_ = /https?:\/\/[^\s"'<>()\\]+/g;

/** An image address without its query or hash, so a resized or cache-busted copy still matches. */
function bareUrl(url: string): string {
  return url.split(/[?#]/)[0];
}

function editHref(page: { id: string; pageType: string }): string {
  if (page.pageType === "story") return `/admin/stories/${page.id}/edit`;
  if (page.pageType === STORIES_INDEX_TYPE) return "/admin/stories/index/edit";
  return `/admin/pages/${page.id}/edit`;
}

/**
 * For every library photo: how many galleries it's in, and which pages and
 * stories use it. Blocks keep a photo either by id (Selected Work, Photo
 * Plate) or by address (image fields), so both are looked for, anywhere in a
 * page's content, share image and story frontispiece.
 */
export async function selectPhotoUsage(): Promise<Record<string, PhotoUsage>> {
  const [photoRows, countRows, pageRows] = await Promise.all([
    db
      .select({ id: photos.id, blobUrl: photos.blobUrl, url: photos.url, thumbnailUrl: photos.thumbnailUrl })
      .from(photos),
    db
      .select({ photoId: galleryPhotos.photoId, n: count() })
      .from(galleryPhotos)
      .groupBy(galleryPhotos.photoId),
    db
      .select({
        id: pages.id,
        title: pages.title,
        pageType: pages.pageType,
        content: pages.content,
        ogImageUrl: pages.ogImageUrl,
        storyMeta: pages.storyMeta,
      })
      .from(pages),
  ]);

  const usage: Record<string, PhotoUsage> = {};
  const byRef = new Map<string, string>();
  for (const p of photoRows) {
    usage[p.id] = { galleryCount: 0, pages: [] };
    byRef.set(p.id.toLowerCase(), p.id);
    for (const u of [p.url, p.thumbnailUrl, p.blobUrl]) if (u) byRef.set(bareUrl(u), p.id);
  }
  for (const r of countRows) if (usage[r.photoId]) usage[r.photoId].galleryCount = Number(r.n);

  for (const page of pageRows) {
    const text = JSON.stringify([page.content, page.ogImageUrl, page.storyMeta]);
    const found = new Set<string>();
    for (const m of text.match(UUID) ?? []) {
      const id = byRef.get(m.toLowerCase());
      if (id) found.add(id);
    }
    for (const m of text.match(URL_) ?? []) {
      const id = byRef.get(bareUrl(m));
      if (id) found.add(id);
    }
    const use: PhotoPageUse = {
      id: page.id,
      title: page.title,
      kind: page.pageType === "story" ? "story" : "page",
      editHref: editHref(page),
    };
    for (const id of found) usage[id].pages.push(use);
  }

  return usage;
}
