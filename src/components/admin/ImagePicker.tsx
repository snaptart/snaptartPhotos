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

interface ImagePickerProps {
  value: string;
  onChange: (url: string) => void;
}

export default function ImagePicker({ value, onChange }: ImagePickerProps) {
  const [open, setOpen] = useState(false);
  const [galleries, setGalleries] = useState<Gallery[]>([]);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [selectedGallery, setSelectedGallery] = useState<string>("");
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

  function handleSelect(photo: Photo) {
    onChange(photo.url);
    setOpen(false);
  }

  return (
    <div className="space-y-2">
      {/* Preview + current value */}
      {value && (
        <div className="relative">
          <img
            src={value}
            alt=""
            className="h-24 w-full rounded border border-neutral-200 object-cover"
          />
          <button
            type="button"
            onClick={() => onChange("")}
            className="absolute top-1 right-1 rounded bg-black/60 px-1.5 py-0.5 text-xs text-white hover:bg-black/80"
          >
            Clear
          </button>
        </div>
      )}

      <div className="flex gap-2">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Image URL or browse..."
          className="flex-1 rounded border border-neutral-300 px-2 py-1.5 text-xs focus:border-neutral-500 focus:outline-none"
        />
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="shrink-0 rounded bg-neutral-800 px-3 py-1.5 text-xs text-white hover:bg-neutral-700"
        >
          Browse
        </button>
      </div>

      {/* Modal */}
      {open && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50">
          <div className="mx-4 flex max-h-[80vh] w-full max-w-2xl flex-col rounded-lg bg-white shadow-xl">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-neutral-200 px-4 py-3">
              <h3 className="text-sm font-semibold">Select Image</h3>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-neutral-400 hover:text-neutral-700"
              >
                &times;
              </button>
            </div>

            {/* Gallery selector */}
            <div className="border-b border-neutral-200 px-4 py-2">
              <select
                value={selectedGallery}
                onChange={(e) => setSelectedGallery(e.target.value)}
                className="w-full rounded border border-neutral-300 px-2 py-1.5 text-sm focus:border-neutral-500 focus:outline-none"
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
            </div>

            {/* Photo grid */}
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
                <div className="grid grid-cols-3 gap-2">
                  {photos.map((photo) => (
                    <button
                      key={photo.id}
                      type="button"
                      onClick={() => handleSelect(photo)}
                      className="group relative aspect-square overflow-hidden rounded border border-neutral-200 hover:border-neutral-900"
                    >
                      <img
                        src={photo.thumbnailUrl}
                        alt={photo.title ?? ""}
                        className="h-full w-full object-cover"
                      />
                      <div className="absolute inset-0 flex items-end bg-gradient-to-t from-black/50 to-transparent opacity-0 transition group-hover:opacity-100">
                        <span className="truncate px-2 py-1 text-xs text-white">
                          {photo.title ?? "Untitled"}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
