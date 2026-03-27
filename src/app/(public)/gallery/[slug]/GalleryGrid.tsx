"use client";

import { useState } from "react";
import Image from "next/image";

interface Photo {
  id: string;
  url: string;
  thumbnailUrl: string;
  title: string | null;
  description: string | null;
  location: string | null;
  width: number;
  height: number;
}

export default function GalleryGrid({ photos }: { photos: Photo[] }) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  return (
    <>
      {/* Masonry-style grid */}
      <div className="columns-1 gap-4 sm:columns-2 lg:columns-3">
        {photos.map((photo, index) => (
          <button
            key={photo.id}
            onClick={() => setSelectedIndex(index)}
            className="mb-4 block w-full overflow-hidden rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-400"
          >
            <Image
              src={photo.url}
              alt={photo.title ?? ""}
              width={photo.width}
              height={photo.height}
              className="w-full transition-transform duration-300 hover:scale-[1.02]"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            />
          </button>
        ))}
      </div>

      {/* Lightbox */}
      {selectedIndex !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90"
          onClick={() => setSelectedIndex(null)}
        >
          {/* Close button */}
          <button
            onClick={() => setSelectedIndex(null)}
            className="absolute right-4 top-4 text-3xl text-white/70 hover:text-white"
          >
            &times;
          </button>

          {/* Prev */}
          {selectedIndex > 0 && (
            <button
              onClick={(e) => { e.stopPropagation(); setSelectedIndex(selectedIndex - 1); }}
              className="absolute left-4 text-4xl text-white/70 hover:text-white"
            >
              &#8249;
            </button>
          )}

          {/* Image + info */}
          <div
            className="flex max-h-[90vh] max-w-[90vw] flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            <Image
              src={photos[selectedIndex].url}
              alt={photos[selectedIndex].title ?? ""}
              width={photos[selectedIndex].width}
              height={photos[selectedIndex].height}
              className="max-h-[80vh] w-auto object-contain"
              sizes="90vw"
              priority
            />
            {(photos[selectedIndex].title || photos[selectedIndex].location) && (
              <div className="mt-3 text-center text-white">
                {photos[selectedIndex].title && (
                  <p className="text-lg">{photos[selectedIndex].title}</p>
                )}
                {photos[selectedIndex].location && (
                  <p className="text-sm text-white/60">{photos[selectedIndex].location}</p>
                )}
              </div>
            )}
          </div>

          {/* Next */}
          {selectedIndex < photos.length - 1 && (
            <button
              onClick={(e) => { e.stopPropagation(); setSelectedIndex(selectedIndex + 1); }}
              className="absolute right-4 text-4xl text-white/70 hover:text-white"
            >
              &#8250;
            </button>
          )}
        </div>
      )}
    </>
  );
}
