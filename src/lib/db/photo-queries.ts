import "server-only";
import { db } from "./index";
import { photos, galleryPhotos } from "./schema";
import { and, asc, eq, inArray, sql } from "drizzle-orm";

// Flat photo row shape returned to callers — includes per-gallery `position`
// from the junction so existing downstream code keeps working without a
// refactor.
const photoFields = {
  id: photos.id,
  blobUrl: photos.blobUrl,
  url: photos.url,
  thumbnailUrl: photos.thumbnailUrl,
  filename: photos.filename,
  title: photos.title,
  description: photos.description,
  location: photos.location,
  latitude: photos.latitude,
  longitude: photos.longitude,
  cameraSettings: photos.cameraSettings,
  tags: photos.tags,
  width: photos.width,
  height: photos.height,
  focalX: photos.focalX,
  focalY: photos.focalY,
  takenAt: photos.takenAt,
  createdAt: photos.createdAt,
  updatedAt: photos.updatedAt,
} as const;

export type GalleryPhoto = Awaited<ReturnType<typeof selectPhotosForGallery>>[number];

export function selectPhotosForGallery(galleryId: string) {
  return db
    .select({ ...photoFields, galleryId: galleryPhotos.galleryId, position: galleryPhotos.position })
    .from(photos)
    .innerJoin(galleryPhotos, eq(galleryPhotos.photoId, photos.id))
    .where(eq(galleryPhotos.galleryId, galleryId))
    .orderBy(asc(galleryPhotos.position));
}

export function selectPhotosForGalleries(galleryIds: string[]) {
  if (galleryIds.length === 0) return Promise.resolve([] as Awaited<ReturnType<typeof selectPhotosForGallery>>);
  return db
    .select({ ...photoFields, galleryId: galleryPhotos.galleryId, position: galleryPhotos.position })
    .from(photos)
    .innerJoin(galleryPhotos, eq(galleryPhotos.photoId, photos.id))
    .where(inArray(galleryPhotos.galleryId, galleryIds))
    .orderBy(asc(galleryPhotos.position));
}

export async function selectGalleryIdsForPhoto(photoId: string): Promise<string[]> {
  const rows = await db
    .select({ galleryId: galleryPhotos.galleryId })
    .from(galleryPhotos)
    .where(eq(galleryPhotos.photoId, photoId));
  return rows.map((r) => r.galleryId);
}

// Append a photo to a gallery at position = max+1. No-op if already a member.
export async function addPhotoToGallery(photoId: string, galleryId: string): Promise<void> {
  await db
    .insert(galleryPhotos)
    .values({
      galleryId,
      photoId,
      position: sql`COALESCE((SELECT MAX(position) + 1 FROM gallery_photos WHERE gallery_id = ${galleryId}), 0)`,
    })
    .onConflictDoNothing();
}

// Replace a photo's gallery memberships with the given set. New memberships
// are appended at position = max+1 in each gallery. Existing memberships keep
// their position.
export async function setPhotoGalleries(photoId: string, galleryIds: string[]): Promise<void> {
  const current = await selectGalleryIdsForPhoto(photoId);
  const target = new Set(galleryIds);
  const toRemove = current.filter((id) => !target.has(id));
  const toAdd = galleryIds.filter((id) => !current.includes(id));

  if (toRemove.length > 0) {
    await db
      .delete(galleryPhotos)
      .where(
        and(eq(galleryPhotos.photoId, photoId), inArray(galleryPhotos.galleryId, toRemove))
      );
  }

  for (const galleryId of toAdd) {
    await addPhotoToGallery(photoId, galleryId);
  }
}
