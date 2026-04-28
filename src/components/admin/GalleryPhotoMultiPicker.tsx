"use client";

import { useEffect, useState, useCallback } from "react";

interface Gallery {
  id: string;
  title: string;
  slug: string;
  coverImageUrl: string | null;
}

interface Photo {
  id: string;
  url: string;
  thumbnailUrl: string;
  title: string | null;
  width: number;
  height: number;
}

export interface PickedPhoto {
  url: string;
  title: string;
}

interface GalleryPhotoMultiPickerProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (photos: PickedPhoto[]) => void;
  title?: string;
  confirmLabel?: (count: number) => string;
}

export default function GalleryPhotoMultiPicker({
  open,
  onClose,
  onConfirm,
  title = "Add photos from gallery",
  confirmLabel,
}: GalleryPhotoMultiPickerProps) {
  const [galleries, setGalleries] = useState<Gallery[]>([]);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [selectedGallery, setSelectedGallery] = useState<string>("");
  const [selected, setSelected] = useState<Record<string, Photo>>({});
  const [loadingGalleries, setLoadingGalleries] = useState(false);
  const [loadingPhotos, setLoadingPhotos] = useState(false);

  const fetchGalleries = useCallback(async () => {
    setLoadingGalleries(true);
    const res = await fetch("/api/galleries");
    const data = await res.json();
    setGalleries(data);
    setLoadingGalleries(false);
  }, []);

  const fetchPhotos = useCallback(async (galleryId: string) => {
    setLoadingPhotos(true);
    const res = await fetch(`/api/photos?galleryId=${galleryId}`);
    const data = await res.json();
    setPhotos(data);
    setLoadingPhotos(false);
  }, []);

  useEffect(() => {
    if (open && galleries.length === 0) {
      fetchGalleries();
    }
  }, [open, galleries.length, fetchGalleries]);

  useEffect(() => {
    if (selectedGallery) {
      fetchPhotos(selectedGallery);
    } else {
      setPhotos([]);
    }
  }, [selectedGallery, fetchPhotos]);

  // Reset selection whenever the modal closes
  useEffect(() => {
    if (!open) {
      setSelected({});
      setSelectedGallery("");
      setPhotos([]);
    }
  }, [open]);

  const toggle = (photo: Photo) => {
    setSelected((prev) => {
      const next = { ...prev };
      if (next[photo.id]) delete next[photo.id];
      else next[photo.id] = photo;
      return next;
    });
  };

  const selectAll = () => {
    setSelected((prev) => {
      const next = { ...prev };
      for (const p of photos) next[p.id] = p;
      return next;
    });
  };

  const clearSelection = () => setSelected({});

  const count = Object.keys(selected).length;
  const allOnPageSelected =
    photos.length > 0 && photos.every((p) => selected[p.id]);

  function handleConfirm() {
    const ordered = photos
      .filter((p) => selected[p.id])
      .map((p) => ({ url: p.url, title: p.title ?? "" }));
    if (ordered.length === 0) return;
    onConfirm(ordered);
    onClose();
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50">
      <div className="mx-4 flex max-h-[85vh] w-full max-w-3xl flex-col rounded-lg bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-neutral-200 px-4 py-3">
          <h3 className="text-sm font-semibold">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-700"
          >
            &times;
          </button>
        </div>

        <div className="flex items-center gap-2 border-b border-neutral-200 px-4 py-2">
          <select
            value={selectedGallery}
            onChange={(e) => setSelectedGallery(e.target.value)}
            className="flex-1 rounded border border-neutral-300 px-2 py-1.5 text-sm focus:border-neutral-500 focus:outline-none"
          >
            <option value="">
              {loadingGalleries ? "Loading..." : "Select a gallery..."}
            </option>
            {galleries.map((g) => (
              <option key={g.id} value={g.id}>
                {g.title}
              </option>
            ))}
          </select>
          {photos.length > 0 && (
            <button
              type="button"
              onClick={allOnPageSelected ? clearSelection : selectAll}
              className="shrink-0 rounded border border-neutral-300 px-2 py-1.5 text-xs hover:border-neutral-500"
            >
              {allOnPageSelected ? "Clear" : "Select all"}
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {!selectedGallery && (
            <p className="text-center text-sm text-neutral-400">
              Choose a gallery to browse photos
            </p>
          )}
          {loadingPhotos && (
            <p className="text-center text-sm text-neutral-400">Loading...</p>
          )}
          {selectedGallery && !loadingPhotos && photos.length === 0 && (
            <p className="text-center text-sm text-neutral-400">
              No photos in this gallery
            </p>
          )}
          {photos.length > 0 && (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {photos.map((photo) => {
                const isSelected = !!selected[photo.id];
                return (
                  <button
                    key={photo.id}
                    type="button"
                    onClick={() => toggle(photo)}
                    className={`group relative aspect-square overflow-hidden rounded border-2 transition ${
                      isSelected
                        ? "border-neutral-900 ring-2 ring-neutral-900/20"
                        : "border-neutral-200 hover:border-neutral-500"
                    }`}
                  >
                    <img
                      src={photo.thumbnailUrl}
                      alt={photo.title ?? ""}
                      className="h-full w-full object-cover"
                    />
                    {isSelected && (
                      <div className="absolute top-1 right-1 flex h-5 w-5 items-center justify-center rounded-full bg-neutral-900 text-xs text-white">
                        &#10003;
                      </div>
                    )}
                    <div className="absolute inset-x-0 bottom-0 flex items-end bg-gradient-to-t from-black/50 to-transparent opacity-0 transition group-hover:opacity-100">
                      <span className="truncate px-2 py-1 text-xs text-white">
                        {photo.title ?? "Untitled"}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-neutral-200 px-4 py-3">
          <span className="text-xs text-neutral-500">
            {count === 0 ? "No photos selected" : `${count} selected`}
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded border border-neutral-300 px-3 py-1.5 text-xs hover:border-neutral-500"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={count === 0}
              className="rounded bg-neutral-900 px-3 py-1.5 text-xs text-white hover:bg-neutral-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {confirmLabel ? confirmLabel(count) : `Add ${count || ""}`.trim()}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
