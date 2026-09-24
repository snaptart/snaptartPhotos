import "server-only";
import { selectPhotosByIds } from "@/lib/db/photo-queries";
import { collectPhotoIds, type LibraryPhoto } from "./photo-ref";

/**
 * The current library copy of every photo a page's Selected Work and Photo
 * Plate blocks picked, keyed by photo id, for PuckRenderer's metadata.
 */
export async function loadPickedPhotos(data: unknown): Promise<Record<string, LibraryPhoto>> {
  const ids = collectPhotoIds(data);
  if (ids.length === 0) return {};
  const rows = await selectPhotosByIds(ids);
  return Object.fromEntries(
    rows.map((p) => [
      p.id,
      {
        id: p.id,
        url: p.url,
        thumbnailUrl: p.thumbnailUrl ?? p.url,
        filename: p.filename ?? null,
        title: p.title,
        description: p.description,
        location: p.location,
        cameraSettings: p.cameraSettings as LibraryPhoto["cameraSettings"],
        takenAt: p.takenAt ? p.takenAt.toISOString() : null,
        width: p.width ?? 800,
        height: p.height ?? 600,
        focalX: p.focalX ?? 50,
        focalY: p.focalY ?? 50,
      },
    ])
  );
}
