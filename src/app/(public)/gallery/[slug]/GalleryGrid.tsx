"use client";

import { useState } from "react";
import Image from "next/image";
import Lightbox from "@/components/public/Lightbox";
import type { LightboxSettings } from "@/components/public/Lightbox";
import { fontRole } from "@/lib/theme/role-style";
import { galleryAspectCss, type GalleryAspect } from "@/lib/theme/aspect";

interface Photo {
  id: string;
  url: string;
  thumbnailUrl: string;
  title: string | null;
  description: string | null;
  location: string | null;
  width: number;
  height: number;
  focalX?: number | null;
  focalY?: number | null;
  takenAt?: Date | string | null;
}

function year(takenAt: Photo["takenAt"]): string | null {
  if (!takenAt) return null;
  const d = takenAt instanceof Date ? takenAt : new Date(takenAt);
  return Number.isNaN(d.getTime()) ? null : String(d.getUTCFullYear());
}

export default function GalleryGrid({
  photos,
  lightboxSettings,
  aspectRatio,
}: {
  photos: Photo[];
  lightboxSettings?: LightboxSettings;
  /** Shares the vocabulary with the Puck gallery blocks — see lib/theme/aspect.ts. */
  aspectRatio?: GalleryAspect;
}) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  // undefined = "natural": don't crop, let each photo keep its own proportions.
  const ar = galleryAspectCss(aspectRatio);

  return (
    <>
      {/* Uniform hang by default. A fixed ratio is what makes the grid read as a
          wall rather than a feed — "natural" opts out and lets rows go ragged. */}
      <div className="grid grid-cols-1 gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
        {photos.map((photo, index) => {
          const meta = [photo.location, year(photo.takenAt)].filter(Boolean).join(" · ");
          return (
            <figure key={photo.id} className="m-0">
              <button
                onClick={() => setSelectedIndex(index)}
                aria-label={photo.title ?? "View photograph"}
                className="group block w-full cursor-pointer border-0 bg-transparent p-0 focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4"
                style={{ outlineColor: "var(--theme-color-accent)" }}
              >
                {ar ? (
                  <div className="relative w-full overflow-hidden" style={{ aspectRatio: ar }}>
                    <Image
                      src={photo.thumbnailUrl || photo.url}
                      alt={photo.title ?? ""}
                      fill
                      className="object-cover opacity-0 transition-opacity duration-300 group-hover:opacity-[0.88]"
                      style={{
                        objectPosition: `${photo.focalX ?? 50}% ${photo.focalY ?? 50}%`,
                      }}
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      priority={index < 6}
                      ref={(el) => { if (el?.complete) el.classList.remove("opacity-0"); }}
                      onLoad={(e) => { (e.target as HTMLImageElement).classList.remove("opacity-0"); }}
                    />
                  </div>
                ) : (
                  <Image
                    src={photo.thumbnailUrl || photo.url}
                    alt={photo.title ?? ""}
                    width={photo.width}
                    height={photo.height}
                    className="block w-full h-auto opacity-0 transition-opacity duration-300 group-hover:opacity-[0.88]"
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    priority={index < 6}
                    ref={(el) => { if (el?.complete) el.classList.remove("opacity-0"); }}
                    onLoad={(e) => { (e.target as HTMLImageElement).classList.remove("opacity-0"); }}
                  />
                )}
              </button>

              {(photo.title || meta) && (
                <figcaption
                  className="mt-4 border-t pt-3 text-left"
                  style={{ borderColor: "var(--theme-color-rule)" }}
                >
                  {photo.title && (
                    <div className="text-[17px]" style={fontRole("captions")}>
                      {photo.title}
                    </div>
                  )}
                  {meta && (
                    <div
                      className="mt-1 text-[11px] uppercase tracking-[0.1em]"
                      style={{ color: "var(--theme-color-gallery-captions)" }}
                    >
                      {meta}
                    </div>
                  )}
                </figcaption>
              )}
            </figure>
          );
        })}
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
