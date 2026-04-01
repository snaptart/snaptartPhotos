"use client";

import { useState, useRef, useCallback, useEffect } from "react";
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
  const navTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchStartRef = useRef({ x: 0, y: 0 });

  // Refs for direct DOM slide animation
  const incomingRef = useRef<HTMLDivElement>(null);
  const outgoingRef = useRef<HTMLDivElement>(null);
  const slideDirRef = useRef<"left" | "right" | null>(null);

  function openLightbox(index: number) {
    if (navTimer.current) clearTimeout(navTimer.current);
    slideDirRef.current = null;
    setSelectedIndex(index);
    setDisplayIndex(index);
    setOutgoingIndex(null);
    setCrossfading(false);
  }

  function navigateTo(index: number, direction?: "left" | "right") {
    if (navTimer.current) clearTimeout(navTimer.current);
    const prev = displayIndex;
    slideDirRef.current = direction ?? null;
    setOutgoingIndex(prev);
    setCrossfading(false);
    setDisplayIndex(index);
    setSelectedIndex(index);

    if (!direction) {
      // Crossfade: use the rAF approach
      requestAnimationFrame(() => requestAnimationFrame(() => {
        setCrossfading(true);
      }));
      navTimer.current = setTimeout(() => {
        setOutgoingIndex(null);
        setCrossfading(false);
      }, FADE_MS + 50);
    }
    // Slide animation is handled via useEffect + DOM refs
  }

  // Drive the slide animation imperatively via DOM refs
  useEffect(() => {
    const dir = slideDirRef.current;
    if (!dir || outgoingIndex === null) return;

    const inEl = incomingRef.current;
    const outEl = outgoingRef.current;
    if (!inEl || !outEl) return;

    const offscreen = dir === "left" ? "100vw" : "-100vw";
    const exitTo = dir === "left" ? "-100vw" : "100vw";

    // 1. Position at start — no transition
    inEl.style.transition = "none";
    outEl.style.transition = "none";
    inEl.style.transform = `translate3d(${offscreen}, 0, 0)`;
    outEl.style.transform = "translate3d(0, 0, 0)";

    // 2. Force reflow so browser registers the starting position
    inEl.getBoundingClientRect();

    // 3. Enable transition and set end position
    inEl.style.transition = `transform ${SLIDE_MS}ms ease`;
    outEl.style.transition = `transform ${SLIDE_MS}ms ease`;
    inEl.style.transform = "translate3d(0, 0, 0)";
    outEl.style.transform = `translate3d(${exitTo}, 0, 0)`;

    // 4. Clean up after animation
    navTimer.current = setTimeout(() => {
      slideDirRef.current = null;
      setOutgoingIndex(null);
      setCrossfading(false);
    }, SLIDE_MS + 50);
  }, [outgoingIndex, displayIndex]);

  const isSliding = slideDirRef.current !== null;
  const incomingOpacity = outgoingIndex === null || crossfading ? 1 : 0;

  const photoContent = (photo: Photo, priority: boolean) => (
    <>
      <Image
        src={photo.url}
        alt={photo.title ?? ""}
        width={photo.width}
        height={photo.height}
        className="max-h-[80vh] w-auto object-contain"
        sizes="90vw"
        priority={priority}
      />
      {(photo.title || photo.location) && (
        <div className="mt-3 text-center text-white">
          {photo.title && <p className="text-lg">{photo.title}</p>}
          {photo.location && <p className="text-sm text-white/60">{photo.location}</p>}
        </div>
      )}
    </>
  );

  const photoSlot = (index: number, isOutgoing: boolean) => {
    const photo = photos[index];

    if (isSliding) {
      return (
        <div
          ref={isOutgoing ? outgoingRef : incomingRef}
          style={{
            gridArea: "1/1",
            pointerEvents: isOutgoing ? "none" : "auto",
            willChange: "transform",
          }}
          className="flex flex-col items-center"
        >
          {photoContent(photo, !isOutgoing)}
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
        {photoContent(photo, !isOutgoing)}
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
      {selectedIndex !== null && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/90"
            onTouchStart={(e) => {
              touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
            }}
            onTouchEnd={(e) => {
              const dx = e.changedTouches[0].clientX - touchStartRef.current.x;
              const dy = e.changedTouches[0].clientY - touchStartRef.current.y;
              if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) {
                if (dx < 0) navigateTo((selectedIndex + 1) % photos.length, "left");
                else navigateTo((selectedIndex - 1 + photos.length) % photos.length, "right");
              }
            }}
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
      )}
    </>
  );
}
