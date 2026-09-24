"use client";

import { useState } from "react";
import GalleryPhotoMultiPicker, { type PickedPhoto } from "@/components/admin/GalleryPhotoMultiPicker";
import type { PhotoRef } from "@/lib/puck/photo-ref";
import { ListControl, ListItemField } from "./ListControl";

function refFromPicked(p: PickedPhoto): PhotoRef {
  return {
    id: crypto.randomUUID(),
    photoId: p.photoId,
    url: p.url,
    thumbnailUrl: p.thumbnailUrl,
    title: p.title,
    width: p.width,
    height: p.height,
    focalX: p.focalX,
    focalY: p.focalY,
    description: p.description,
    location: p.location,
    cameraSettings: p.cameraSettings,
    takenAt: p.takenAt,
  };
}

function Thumb({ photo, size = 32 }: { photo: PhotoRef; size?: number }) {
  return (
    <img
      src={photo.thumbnailUrl || photo.url}
      alt=""
      className="shrink-0 rounded-sm object-cover"
      style={{ width: size, height: size, objectPosition: `${photo.focalX}% ${photo.focalY}%` }}
    />
  );
}

/** Hand-picked photographs from the library, in the order they'll show. */
export function PhotoListControl({
  value,
  onChange,
}: {
  value: PhotoRef[] | null | undefined;
  onChange: (photos: PhotoRef[]) => void;
}) {
  const [picking, setPicking] = useState(false);
  const photos = value ?? [];
  return (
    <>
      <ListControl<PhotoRef>
        value={photos}
        onChange={onChange}
        addLabel="Add photos"
        onAdd={() => setPicking(true)}
        leading={(p) => <Thumb photo={p} />}
        summary={(p) => p.titleOverride || p.title || "Untitled"}
        renderItem={(p, update) => (
          <ListItemField
            label="Title here"
            value={p.titleOverride ?? ""}
            placeholder={p.title || "Untitled"}
            onChange={(v) => update({ titleOverride: v || undefined })}
          />
        )}
      />
      <GalleryPhotoMultiPicker
        open={picking}
        onClose={() => setPicking(false)}
        onConfirm={(picked) => onChange([...photos, ...picked.map(refFromPicked)])}
        title="Add photos"
      />
    </>
  );
}

/** One photograph from the library. */
export function PhotoControl({
  value,
  onChange,
}: {
  value: PhotoRef | null | undefined;
  onChange: (photo: PhotoRef | null) => void;
}) {
  const [picking, setPicking] = useState(false);
  return (
    <>
      {value ? (
        <div className="flex items-center gap-2 rounded-md border border-admin-border bg-admin-surface p-1.5">
          <Thumb photo={value} size={48} />
          <span className="min-w-0 flex-1 truncate text-[13px] text-admin-ink">{value.title || "Untitled"}</span>
          <button type="button" onClick={() => setPicking(true)} className="shrink-0 rounded px-1 py-1 text-[12px] text-admin-ink-soft hover:text-admin-ink">
            Change
          </button>
          <button type="button" onClick={() => onChange(null)} className="shrink-0 rounded px-1 py-1 text-[12px] text-admin-ink-soft hover:text-admin-danger">
            Remove
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setPicking(true)}
          className="w-full rounded-md border border-dashed border-admin-border-strong py-6 text-[12px] text-admin-ink-soft hover:border-admin-accent hover:text-admin-ink"
        >
          Choose a photo from the library
        </button>
      )}
      <GalleryPhotoMultiPicker
        open={picking}
        single
        onClose={() => setPicking(false)}
        onConfirm={(picked) => picked[0] && onChange(refFromPicked(picked[0]))}
        title="Choose a photo"
        confirmLabel={() => "Use this photo"}
      />
    </>
  );
}
