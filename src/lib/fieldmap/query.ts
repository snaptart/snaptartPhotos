import "server-only";
import { db } from "@/lib/db";
import { galleries, photos } from "@/lib/db/schema";
import { and, asc, eq, inArray, isNotNull } from "drizzle-orm";
import type { FieldMapFilter, FieldMapRegion } from "@/components/public/fieldmap/types";

const DEFAULT_ACCENT = "#5b6470";

export const DEFAULT_FIELD_MAP_FILTERS: FieldMapFilter[] = [
  { id: "all", label: "All" },
  { id: "portraits", label: "Portraits", tag: "portrait" },
  { id: "street", label: "Street", tag: "street" },
  { id: "landscape", label: "Landscape", tag: "landscape" },
  { id: "film", label: "Film", tag: "film" },
  { id: "interiors", label: "Interiors", tag: "interior" },
  { id: "night", label: "Night", tag: "night" },
];

export type FieldMapData = {
  regions: FieldMapRegion[];
  yearBounds: [number, number];
  filters: FieldMapFilter[];
};

export async function getFieldMapData(): Promise<FieldMapData> {
  const galleryRows = await db
    .select()
    .from(galleries)
    .where(
      and(
        eq(galleries.isPublished, true),
        isNotNull(galleries.latitude),
        isNotNull(galleries.longitude)
      )
    )
    .orderBy(asc(galleries.position));

  if (galleryRows.length === 0) {
    const currentYear = new Date().getFullYear();
    return {
      regions: [],
      yearBounds: [currentYear - 4, currentYear],
      filters: DEFAULT_FIELD_MAP_FILTERS,
    };
  }

  const galleryIds = galleryRows.map((g) => g.id);
  const photoRows = await db
    .select({
      id: photos.id,
      galleryId: photos.galleryId,
      thumbnailUrl: photos.thumbnailUrl,
      url: photos.url,
      tags: photos.tags,
      createdAt: photos.createdAt,
      position: photos.position,
    })
    .from(photos)
    .where(inArray(photos.galleryId, galleryIds))
    .orderBy(asc(photos.position));

  const byGallery = new Map<string, typeof photoRows>();
  for (const p of photoRows) {
    const arr = byGallery.get(p.galleryId) ?? [];
    arr.push(p);
    byGallery.set(p.galleryId, arr);
  }

  let globalMin = Number.POSITIVE_INFINITY;
  let globalMax = Number.NEGATIVE_INFINITY;

  const regions: FieldMapRegion[] = galleryRows.map((g) => {
    const ps = byGallery.get(g.id) ?? [];
    const tagCounts: Record<string, number> = {};
    const photosByYearTag: Array<{ year: number; tag: string | null }> = [];
    let minYear = Number.POSITIVE_INFINITY;
    let maxYear = Number.NEGATIVE_INFINITY;

    for (const p of ps) {
      const year = p.createdAt.getFullYear();
      const primaryTag = p.tags && p.tags.length > 0 ? p.tags[0].toLowerCase() : null;
      if (primaryTag) tagCounts[primaryTag] = (tagCounts[primaryTag] ?? 0) + 1;
      photosByYearTag.push({ year, tag: primaryTag });
      if (year < minYear) minYear = year;
      if (year > maxYear) maxYear = year;
    }

    if (!Number.isFinite(minYear)) {
      const now = new Date().getFullYear();
      minYear = now;
      maxYear = now;
    }
    if (minYear < globalMin) globalMin = minYear;
    if (maxYear > globalMax) globalMax = maxYear;

    const previewThumbs = ps.slice(0, 6).map((p) => p.thumbnailUrl ?? p.url);

    return {
      id: g.id,
      slug: g.slug,
      name: g.title,
      latitude: g.latitude ?? 0,
      longitude: g.longitude ?? 0,
      accentColor: g.accentColor ?? DEFAULT_ACCENT,
      flavor: g.tagline,
      totalCount: ps.length,
      tagCounts,
      yearRange: [minYear, maxYear],
      previewThumbs,
      photosByYearTag,
    };
  });

  if (!Number.isFinite(globalMin) || !Number.isFinite(globalMax)) {
    const now = new Date().getFullYear();
    globalMin = now - 4;
    globalMax = now;
  }

  return {
    regions,
    yearBounds: [globalMin, globalMax],
    filters: DEFAULT_FIELD_MAP_FILTERS,
  };
}
