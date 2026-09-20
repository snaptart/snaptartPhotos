import "server-only";
import { db } from "@/lib/db";
import { photos, galleries, pages } from "@/lib/db/schema";
import { sql, desc, eq, and, or, isNull, ne } from "drizzle-orm";

export type DashboardCounts = {
  totalPhotos: number;
  totalGalleries: number;
  publishedGalleries: number;
  totalPages: number;
  totalStories: number;
  photosMissingTitle: number;
  photosMissingLocation: number;
  draftPages: number;
};

type RecentPhoto = {
  id: string;
  thumbnailUrl: string;
  title: string | null;
  filename: string | null;
  createdAt: Date;
};

type RecentGallery = {
  id: string;
  title: string;
  slug: string;
  coverImageUrl: string | null;
  isPublished: boolean;
};

export async function getDashboardCounts(): Promise<DashboardCounts> {
  const countFn = sql<number>`count(*)::int`;

  const [
    [{ n: totalPhotos }],
    [{ n: totalGalleries }],
    [{ n: publishedGalleries }],
    [{ n: totalPages }],
    [{ n: totalStories }],
    [{ n: photosMissingTitle }],
    [{ n: photosMissingLocation }],
    [{ n: draftPages }],
  ] = await Promise.all([
    db.select({ n: countFn }).from(photos),
    db.select({ n: countFn }).from(galleries),
    db.select({ n: countFn }).from(galleries).where(eq(galleries.isPublished, true)),
    db.select({ n: countFn }).from(pages).where(ne(pages.pageType, "story")),
    db.select({ n: countFn }).from(pages).where(eq(pages.pageType, "story")),
    db
      .select({ n: countFn })
      .from(photos)
      .where(or(isNull(photos.title), eq(photos.title, ""))),
    db
      .select({ n: countFn })
      .from(photos)
      .where(or(isNull(photos.location), eq(photos.location, ""))),
    db
      .select({ n: countFn })
      .from(pages)
      .where(and(ne(pages.pageType, "story"), eq(pages.isPublished, false))),
  ]);

  return {
    totalPhotos,
    totalGalleries,
    publishedGalleries,
    totalPages,
    totalStories,
    photosMissingTitle,
    photosMissingLocation,
    draftPages,
  };
}

export async function getRecentPhotos(limit = 5): Promise<RecentPhoto[]> {
  return db
    .select({
      id: photos.id,
      thumbnailUrl: photos.thumbnailUrl,
      title: photos.title,
      filename: photos.filename,
      createdAt: photos.createdAt,
    })
    .from(photos)
    .orderBy(desc(photos.createdAt))
    .limit(limit);
}

export async function getRecentGalleries(limit = 4): Promise<RecentGallery[]> {
  return db
    .select({
      id: galleries.id,
      title: galleries.title,
      slug: galleries.slug,
      coverImageUrl: galleries.coverImageUrl,
      isPublished: galleries.isPublished,
    })
    .from(galleries)
    .orderBy(desc(galleries.createdAt))
    .limit(limit);
}
