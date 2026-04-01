"use client";

import { useState } from "react";
import Image from "next/image";
import Lightbox from "@/components/public/Lightbox";
import type { LightboxSettings } from "@/components/public/Lightbox";

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

export default function GalleryGrid({ photos, lightboxSettings }: { photos: Photo[]; lightboxSettings?: LightboxSettings }) {
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
              src={photo.thumbnailUrl || photo.url}
              alt={photo.title ?? ""}
              width={photo.width}
              height={photo.height}
              className="w-full opacity-0 transition-[transform,opacity] duration-500 hover:scale-[1.02]"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              ref={(el) => { if (el?.complete) el.classList.remove("opacity-0"); }}
              onLoad={(e) => { (e.target as HTMLImageElement).classList.remove("opacity-0"); }}
            />
          </button>
        ))}
      </div>

      <Lightbox
        photos={photos}
        selectedIndex={selectedIndex}
        onClose={() => setSelectedIndex(null)}
        settings={lightboxSettings}
      />
    </>
  );
}
