import { db } from "@/lib/db";
import { galleries, photos } from "@/lib/db/schema";
import { asc, eq, inArray, sql } from "drizzle-orm";
import type { Metadata } from "next";
import FloorPlan, { type HallGallery } from "@/components/public/hall/FloorPlan";
import siteConfig from "@/lib/site.config";

export const metadata: Metadata = {
  title: `The Hall · ${siteConfig.siteName}`,
  description: "A floor plan of every gallery. Pan, zoom, and step inside.",
};

export default async function HallPage() {
  const rows = await db
    .select({
      id: galleries.id,
      title: galleries.title,
      slug: galleries.slug,
      description: galleries.description,
      tagline: galleries.tagline,
      accentColor: galleries.accentColor,
      floorX: galleries.floorX,
      floorY: galleries.floorY,
      floorW: galleries.floorW,
      floorH: galleries.floorH,
      previewPhotoIds: galleries.previewPhotoIds,
      coverImageUrl: galleries.coverImageUrl,
      position: galleries.position,
      photoCount: sql<number>`count(${photos.id})::int`,
    })
    .from(galleries)
    .leftJoin(photos, eq(photos.galleryId, galleries.id))
    .where(eq(galleries.isPublished, true))
    .groupBy(galleries.id)
    .orderBy(asc(galleries.position));

  const published = rows.filter((r) => r.photoCount > 0);
  const totalPhotos = published.reduce((sum, g) => sum + g.photoCount, 0);

  const thumbs = await Promise.all(
    published.slice(0, 40).map(async (g) => {
      const picks = g.previewPhotoIds?.filter((id): id is string => !!id) ?? [];
      if (picks.length > 0) {
        const rows = await db
          .select({ id: photos.id, url: photos.thumbnailUrl })
          .from(photos)
          .where(inArray(photos.id, picks));
        const byId = new Map(rows.map((r) => [r.id, r.url]));
        const ordered = picks.map((id) => byId.get(id)).filter((u): u is string => !!u);
        return { id: g.id, urls: ordered.slice(0, 4) };
      }
      const ph = await db
        .select({ url: photos.thumbnailUrl })
        .from(photos)
        .where(eq(photos.galleryId, g.id))
        .orderBy(asc(photos.position))
        .limit(2);
      return { id: g.id, urls: ph.map((p) => p.url) };
    }),
  );
  const thumbMap = new Map(thumbs.map((t) => [t.id, t.urls]));

  const roomsNeedingLayout = published.filter(
    (g) => g.floorX == null || g.floorY == null || g.floorW == null || g.floorH == null,
  );
  const autoLayout = layoutRooms(roomsNeedingLayout);

  const hallGalleries: HallGallery[] = published.map((g) => {
    const hasCoords =
      g.floorX != null && g.floorY != null && g.floorW != null && g.floorH != null;
    const layout = hasCoords
      ? { x: g.floorX!, y: g.floorY!, w: g.floorW!, h: g.floorH! }
      : autoLayout.get(g.id)!;
    return {
      id: g.id,
      title: g.title,
      slug: g.slug,
      tagline: g.tagline ?? g.description ?? "",
      accentColor: g.accentColor ?? null,
      count: g.photoCount,
      x: layout.x,
      y: layout.y,
      w: layout.w,
      h: layout.h,
      thumbs: thumbMap.get(g.id) ?? [],
    };
  });

  return (
    <div className="hall-ex relative w-full" style={{ height: "calc(100dvh - var(--hall-nav-offset, 80px))", minHeight: 520 }}>
      <FloorPlan galleries={hallGalleries} totalPhotos={totalPhotos} />
    </div>
  );
}

type Layout = { x: number; y: number; w: number; h: number };

function layoutRooms(
  rooms: { id: string; photoCount: number }[],
): Map<string, Layout> {
  const map = new Map<string, Layout>();
  const n = rooms.length;
  if (n === 0) return map;

  const cols = n <= 3 ? n : n <= 6 ? 3 : n <= 9 ? 3 : 4;
  const rows = Math.ceil(n / cols);

  const marginX = 10;
  const marginY = 14;
  const gapX = 3;
  const gapY = 5;

  const cellW = (100 - marginX * 2 - gapX * (cols - 1)) / cols;
  const cellH = (100 - marginY * 2 - gapY * (rows - 1)) / rows;

  const maxCount = Math.max(...rooms.map((r) => r.photoCount), 1);
  const minCount = Math.min(...rooms.map((r) => r.photoCount), 1);
  const span = Math.max(1, maxCount - minCount);

  rooms.forEach((r, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const t = (r.photoCount - minCount) / span;
    const scale = 0.62 + t * 0.38;
    const w = cellW * scale;
    const h = cellH * scale;
    const cx = marginX + col * (cellW + gapX) + cellW / 2;
    const cy = marginY + row * (cellH + gapY) + cellH / 2;
    map.set(r.id, {
      x: cx - w / 2,
      y: cy - h / 2,
      w,
      h,
    });
  });

  return map;
}
