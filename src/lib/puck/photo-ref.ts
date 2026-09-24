/**
 * A library photograph as a block stores it: the photo's id, plus a snapshot
 * of what the block needs to draw it. Public pages refresh the snapshot from
 * the library (see picked-photos.ts), so a retitled photo shows its new title
 * without the page being re-saved; the editor draws from the snapshot.
 */

export type CameraSettings = { camera?: string; lens?: string; iso?: string; aperture?: string; shutter?: string } | null;

export type PhotoRef = {
  /** This entry's own id, for lists. */
  id: string;
  photoId: string;
  url: string;
  thumbnailUrl: string;
  title: string;
  width: number;
  height: number;
  focalX: number;
  focalY: number;
  description: string | null;
  location: string | null;
  cameraSettings: CameraSettings;
  /** ISO string; missing on refs saved before it was kept. */
  takenAt?: string | null;
  /** Replaces the photo's own title in this block. */
  titleOverride?: string;
};

/** What the page server fills in per photo id (the same shape as a Gallery Embed photo). */
export type LibraryPhoto = {
  id: string;
  url: string;
  thumbnailUrl: string;
  filename: string | null;
  title: string | null;
  description: string | null;
  location: string | null;
  cameraSettings: CameraSettings;
  takenAt: string | null;
  width: number;
  height: number;
  focalX: number;
  focalY: number;
};

type Block = { type: string; props: Record<string, unknown> };
type PuckDoc = { content?: Block[]; zones?: Record<string, Block[]> };

/** Every library photo id referenced by Selected Work and Photo Plate blocks on a page. */
export function collectPhotoIds(data: unknown): string[] {
  const doc = (data ?? {}) as PuckDoc;
  const blocks = [...(doc.content ?? []), ...Object.values(doc.zones ?? {}).flat()];
  const ids = new Set<string>();
  for (const b of blocks) {
    if (b.type === "SelectedWork") {
      for (const p of (b.props.photos as PhotoRef[] | undefined) ?? []) if (p.photoId) ids.add(p.photoId);
    } else if (b.type === "PhotoPlate") {
      const p = b.props.photo as PhotoRef | null | undefined;
      if (p?.photoId) ids.add(p.photoId);
    }
  }
  return [...ids];
}

/** The snapshot, brought up to date with the library copy when there is one. */
export function freshPhoto(ref: PhotoRef, library?: Record<string, LibraryPhoto>): PhotoRef {
  const live = library?.[ref.photoId];
  if (!live) return ref;
  return {
    ...ref,
    url: live.url,
    thumbnailUrl: live.thumbnailUrl,
    title: live.title ?? "",
    width: live.width,
    height: live.height,
    focalX: live.focalX,
    focalY: live.focalY,
    description: live.description,
    location: live.location,
    cameraSettings: live.cameraSettings,
    takenAt: live.takenAt,
  };
}
