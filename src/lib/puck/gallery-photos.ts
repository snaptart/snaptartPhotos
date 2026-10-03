import "server-only";
import { and, eq, inArray } from "drizzle-orm";
import type { Data } from "@puckeditor/core";
import { db } from "@/lib/db";
import { galleries } from "@/lib/db/schema";
import { selectPhotosForGalleries } from "@/lib/db/photo-queries";
import { eachBlock, isPuckData } from "./data-tree";
import type { EmbedPhoto } from "./config";

/** Blocks that show a collection's photos and render the server's copy straight away. */
const GALLERY_BLOCKS = new Set(["GalleryEmbed", "HeroSlideshow"]);

/**
 * The photos every Gallery Embed and Hero Slideshow on a page shows, nested
 * blocks included, keyed by collection slug, for PuckRenderer's metadata.
 * Without them those blocks fetch after the page loads and open empty.
 * Each slug gets as many as the hungriest block wants; blocks trim their own.
 */
export async function loadGalleryPhotos(data: unknown): Promise<Record<string, EmbedPhoto[]>> {
  if (!isPuckData(data)) return {};
  const wanted = new Map<string, number>();
  eachBlock(data as Data, (block) => {
    if (!GALLERY_BLOCKS.has(block.type as string)) return;
    const { gallerySlug, maxPhotos } = block.props as { gallerySlug?: string; maxPhotos?: number };
    if (!gallerySlug) return;
    wanted.set(gallerySlug, Math.max(wanted.get(gallerySlug) ?? 0, maxPhotos || 12));
  });
  if (wanted.size === 0) return {};

  const rows = await db
    .select({ id: galleries.id, slug: galleries.slug })
    .from(galleries)
    .where(and(inArray(galleries.slug, [...wanted.keys()]), eq(galleries.isPublished, true)));
  const photos = await selectPhotosForGalleries(rows.map((g) => g.id));

  const out: Record<string, EmbedPhoto[]> = {};
  for (const g of rows) {
    out[g.slug] = photos
      .filter((p) => p.galleryId === g.id)
      .slice(0, wanted.get(g.slug))
      .map((p) => ({
        id: p.id,
        url: p.url,
        thumbnailUrl: p.thumbnailUrl ?? p.url,
        filename: p.title ?? null,
        title: p.title,
        description: p.description,
        location: p.location,
        cameraSettings: p.cameraSettings as EmbedPhoto["cameraSettings"],
        width: p.width ?? 800,
        height: p.height ?? 600,
        focalX: p.focalX ?? 50,
        focalY: p.focalY ?? 50,
      }));
  }
  return out;
}
