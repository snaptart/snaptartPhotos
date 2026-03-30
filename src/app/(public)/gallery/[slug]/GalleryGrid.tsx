"use client";

import { useState, useRef, useCallback } from "react";
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

const FADE_MS = 200;
const SLIDE_MS = 300;

export default function GalleryGrid({ photos }: { photos: Photo[] }) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [displayIndex, setDisplayIndex] = useState(0);
  const [outgoingIndex, setOutgoingIndex] = useState<number | null>(null);
  const [crossfading, setCrossfading] = useState(false);
  const [slideDir, setSlideDir] = useState<"left" | "right" | null>(null);
  const navTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function openLightbox(index: number) {
    if (navTimer.current) clearTimeout(navTimer.current);
    setSelectedIndex(index);
    setDisplayIndex(index);
    setOutgoingIndex(null);
    setCrossfading(false);
    setSlideDir(null);
  }

  function navigateTo(index: number, direction?: "left" | "right") {
    if (navTimer.current) clearTimeout(navTimer.current);
    const prev = displayIndex;
    setOutgoingIndex(prev);
    setCrossfading(false);
    setSlideDir(direction ?? null);
    setDisplayIndex(index);
    setSelectedIndex(index);
    const duration = direction ? SLIDE_MS : FADE_MS;
    requestAnimationFrame(() => requestAnimationFrame(() => {
      setCrossfading(true);
    }));
    navTimer.current = setTimeout(() => {
      setOutgoingIndex(null);
      setCrossfading(false);
      setSlideDir(null);
    }, duration + 50);
  }

  const incomingOpacity = outgoingIndex === null || crossfading ? 1 : 0;

  const photoSlot = (index: number, isOutgoing: boolean) => {
    const photo = photos[index];

    // Slide transition for swipe navigation
    if (slideDir) {
      // Swiping left (next): outgoing slides left, incoming enters from right
      // Swiping right (prev): outgoing slides right, incoming enters from left
      let transform: string;
      if (isOutgoing) {
        transform = crossfading
          ? `translateX(${slideDir === "left" ? "-100%" : "100%"})`
          : "translateX(0)";
      } else {
        transform = crossfading
          ? "translateX(0)"
          : `translateX(${slideDir === "left" ? "100%" : "-100%"})`;
      }

      return (
        <div
          style={{
            gridArea: "1/1",
            transform,
            transition: `transform ${SLIDE_MS}ms ease`,
            pointerEvents: isOutgoing ? "none" : "auto",
          }}
          className="flex flex-col items-center"
        >
          <Image
            src={photo.url}
            alt={photo.title ?? ""}
            width={photo.width}
            height={photo.height}
            className="max-h-[80vh] w-auto object-contain"
            sizes="90vw"
            priority={!isOutgoing}
          />
          {(photo.title || photo.location) && (
            <div className="mt-3 text-center text-white">
              {photo.title && <p className="text-lg">{photo.title}</p>}
              {photo.location && <p className="text-sm text-white/60">{photo.location}</p>}
            </div>
          )}
        </div>
      );
    }

    // Crossfade transition for arrow/keyboard navigation
    return (
      <div
        style={{
          gridArea: "1/1",
          opacity: isOutgoing ? (crossfading ? 0 : 1) : incomingOpacity,
          transition: outgoingIndex !== null ? `opacity ${FADE_MS}ms ease` : undefined,
          pointerEvents: isOutgoing ? "none" : "auto",
        }}
        className="flex flex-col items-center"
      >
        <Image
          src={photo.url}
          alt={photo.title ?? ""}
          width={photo.width}
          height={photo.height}
          className="max-h-[80vh] w-auto object-contain"
          sizes="90vw"
          priority={!isOutgoing}
        />
        {(photo.title || photo.location) && (
          <div className="mt-3 text-center text-white">
            {photo.title && <p className="text-lg">{photo.title}</p>}
            {photo.location && <p className="text-sm text-white/60">{photo.location}</p>}
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      {/* Masonry-style grid */}
      <div className="columns-1 gap-4 sm:columns-2 lg:columns-3">
        {photos.map((photo, index) => (
          <button
            key={photo.id}
            onClick={() => openLightbox(index)}
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
      {selectedIndex !== null && (() => {
        const touchStart = { x: 0, y: 0 };
        const handleTouchStart = (e: React.TouchEvent) => {
          touchStart.x = e.touches[0].clientX;
          touchStart.y = e.touches[0].clientY;
        };
        const handleTouchEnd = (e: React.TouchEvent) => {
          const dx = e.changedTouches[0].clientX - touchStart.x;
          const dy = e.changedTouches[0].clientY - touchStart.y;
          if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) {
            if (dx < 0) navigateTo((selectedIndex + 1) % photos.length, "left");
            else navigateTo((selectedIndex - 1 + photos.length) % photos.length, "right");
          }
        };

        return (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/90"
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            {/* Close button */}
            <button
              onClick={() => setSelectedIndex(null)}
              className="absolute right-4 top-4 text-3xl text-white/70 hover:text-white"
            >
              &times;
            </button>

            {/* Prev */}
            <button
              onClick={(e) => { e.stopPropagation(); navigateTo((selectedIndex - 1 + photos.length) % photos.length); }}
              className="absolute left-4 text-4xl text-white/70 hover:text-white hidden sm:block"
            >
              &#8249;
            </button>

            {/* Image + info */}
            <div
              className="grid max-h-[90vh] w-full max-w-full sm:max-w-[90vw] place-items-center overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {outgoingIndex !== null && photoSlot(outgoingIndex, true)}
              {photoSlot(displayIndex, false)}
            </div>

            {/* Next */}
            <button
              onClick={(e) => { e.stopPropagation(); navigateTo((selectedIndex + 1) % photos.length); }}
              className="absolute right-4 text-4xl text-white/70 hover:text-white hidden sm:block"
            >
              &#8250;
            </button>
          </div>
        );
      })()}
    </>
  );
}
