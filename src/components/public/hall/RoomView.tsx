"use client";

import Link from "next/link";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import HallLightbox from "./HallLightbox";
import Slide, { deriveFrameNumber } from "../Slide";
import "./SlideSorter.css";

export const ROOM_CAPTION_FIELD_OPTIONS = [
  { key: "title", label: "Title" },
  { key: "description", label: "Description" },
  { key: "location", label: "Location" },
  { key: "year", label: "Year" },
  { key: "camera", label: "Camera settings" },
] as const;

export type RoomCaptionField = (typeof ROOM_CAPTION_FIELD_OPTIONS)[number]["key"];

export const DEFAULT_ROOM_CAPTION_FIELDS: RoomCaptionField[] = ["title", "location", "year"];

// Inline plate cadence in row 0. Each plate occupies one flex slot, so slides
// can never render on top of it. Spacing ≈ viewport width at typical slide
// sizes, so as one plate scrolls off, the next is already approaching.
const PLATE_EVERY = 5;

export type RoomPhoto = {
  id: string;
  url: string;
  thumbnailUrl: string;
  title: string | null;
  description: string | null;
  location: string | null;
  latitude: number | null;
  longitude: number | null;
  cameraSettings: {
    camera?: string;
    lens?: string;
    iso?: string | number;
    aperture?: string;
    shutter?: string;
  } | null;
  width: number;
  height: number;
  takenAt: string | null;
  createdAt: string;
};

export default function RoomView({
  galleryTitle,
  accentColor,
  roomIndex,
  photos,
  captionFields = DEFAULT_ROOM_CAPTION_FIELDS,
  filmStamp,
  handwritingFont,
  stampFont,
  backHref = "/",
  backLabel = "Back to map",
  onBack,
}: {
  galleryTitle: string;
  gallerySlug: string;
  tagline: string;
  accentColor: string | null;
  roomIndex?: number;
  numberingLabel?: string;
  photos: RoomPhoto[];
  captionFields?: readonly string[];
  filmStamp?: string | null;
  handwritingFont?: string | null;
  stampFont?: string | null;
  backHref?: string;
  backLabel?: string;
  returnLabel?: string;
  onBack?: () => void;
}) {
  const router = useRouter();
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [slideSize, setSlideSize] = useState(220);
  const roomRef = useRef<HTMLDivElement | null>(null);
  const scrollerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mql = window.matchMedia("(max-width: 900px)");
    setIsMobile(mql.matches);
    const onMql = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mql.addEventListener("change", onMql);
    return () => mql.removeEventListener("change", onMql);
  }, []);

  // Measure room height → derive slide size so rows fit vertically.
  // Desktop: 3 rows → slide = (roomH / 3) - channel padding allowance.
  // Mobile: 1 row → slide = roomH - plate area - bottom padding.
  useLayoutEffect(() => {
    const el = roomRef.current;
    if (!el) return;
    const update = () => {
      const h = el.clientHeight;
      const size = isMobile
        ? Math.max(180, Math.min(380, h - 110))
        : Math.max(180, Math.min(400, Math.round(((h - 96) / 3 - 6) / 0.95)));
      setSlideSize(size);
    };
    update();
    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", update);
      return () => window.removeEventListener("resize", update);
    }
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [isMobile]);

  // Vertical wheel → horizontal scroll; keyboard arrows to walk the sorter.
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
      e.preventDefault();
      el.scrollLeft += e.deltaY;
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") el.scrollBy({ left: 400, behavior: "smooth" });
      if (e.key === "ArrowLeft") el.scrollBy({ left: -400, behavior: "smooth" });
      if (e.key === "Home") el.scrollTo({ left: 0, behavior: "smooth" });
      if (e.key === "End") el.scrollTo({ left: el.scrollWidth, behavior: "smooth" });
      if (e.key === "Escape" && lightboxIndex === null) {
        if (onBack) onBack();
        else router.push(backHref);
      }
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("keydown", onKey);
    return () => {
      el.removeEventListener("wheel", onWheel);
      window.removeEventListener("keydown", onKey);
    };
  }, [backHref, router, lightboxIndex, onBack]);

  // Assign each photo to a row 1/2/3 (desktop) or row 1 (mobile).
  // Hash is deterministic per photo id so layout is stable across renders.
  // Within each row, photos keep their gallery order.
  const rows = useMemo<RoomPhoto[][]>(() => {
    if (isMobile) return [photos];
    const r: RoomPhoto[][] = [[], [], []];
    for (const p of photos) {
      r[hashToRow(p.id, 3)].push(p);
    }
    return r;
  }, [photos, isMobile]);

  const indexById = useMemo(() => {
    const m = new Map<string, number>();
    photos.forEach((p, i) => m.set(p.id, i));
    return m;
  }, [photos]);

  const galleryNo =
    roomIndex != null ? String(roomIndex + 1).padStart(2, "0") : null;
  const worksLabel = `${photos.length} ${photos.length === 1 ? "Work" : "Works"}`;

  // Caption fields are still honored inside Slide for title/year stamps; the
  // room no longer shows below-photo meta (description/location/camera sit in
  // the lightbox drawer). Suppressed fields just render as nulls on Slide.
  const slideShowTitle = captionFields.includes("title");
  const slideShowYear = captionFields.includes("year");

  return (
    <>
      <HallTokens />

      <div ref={roomRef} className="sorter-room">
        <div
          ref={scrollerRef}
          className="sorter-scroller"
          style={
            {
              "--sorter-slide-size": `${slideSize}px`,
            } as React.CSSProperties
          }
        >
          <div className="sorter-body">
            <div className="sorter-channels">
              {rows.map((rowPhotos, rowIdx) => (
                <div key={rowIdx} className="sorter-channel">
                  {rowPhotos.flatMap((p, rowPos) => {
                    const i = indexById.get(p.id)!;
                    const out: React.ReactElement[] = [];
                    // Inline plates live only in the top row; repeat every
                    // PLATE_EVERY photos so a fresh one slides in as the
                    // previous scrolls out of view.
                    if (rowIdx === 0 && rowPos % PLATE_EVERY === 0) {
                      out.push(
                        <PlateChrome
                          key={`plate-${rowPos}`}
                          variant="inline"
                          galleryTitle={galleryTitle}
                          galleryNo={galleryNo}
                          worksLabel={worksLabel}
                          backLabel={backLabel}
                          backHref={backHref}
                          onBack={onBack}
                          accentColor={accentColor}
                        />
                      );
                    }
                    out.push(
                      <button
                        key={p.id}
                        type="button"
                        className="sorter-slot"
                        onClick={() => setLightboxIndex(i)}
                        aria-label={p.title ?? `Photo ${i + 1}`}
                        style={{
                          background: "transparent",
                          border: "none",
                          cursor: "pointer",
                          padding: 0,
                          marginRight: `${6 + Math.round(hashFloat(p.id, 7) * 44)}px`,
                        }}
                      >
                        <Slide
                          photo={{
                            id: p.id,
                            url: p.url,
                            thumbnailUrl: p.thumbnailUrl,
                            title: slideShowTitle ? p.title : null,
                            width: p.width,
                            height: p.height,
                            takenAt: slideShowYear
                              ? (p.takenAt ?? p.createdAt)
                              : null,
                          }}
                          tilt={0}
                          frameNumber={deriveFrameNumber(i)}
                          filmStamp={filmStamp}
                          handwritingFont={handwritingFont}
                          stampFont={stampFont}
                          sizes={`${slideSize}px`}
                        />
                      </button>
                    );
                    return out;
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>

        <PlateChrome
          variant="fixed"
          galleryTitle={galleryTitle}
          galleryNo={galleryNo}
          worksLabel={worksLabel}
          backLabel={backLabel}
          backHref={backHref}
          onBack={onBack}
          accentColor={accentColor}
        />
      </div>

      {lightboxIndex !== null && (
        <HallLightbox
          galleryTitle={galleryTitle}
          accentColor={accentColor}
          photos={photos}
          index={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onIndexChange={setLightboxIndex}
          filmStamp={filmStamp}
          handwritingFont={handwritingFont}
          stampFont={stampFont}
        />
      )}
    </>
  );
}

function PlateChrome({
  variant,
  galleryTitle,
  galleryNo,
  worksLabel,
  backLabel,
  backHref,
  onBack,
}: {
  variant: "inline" | "fixed";
  galleryTitle: string;
  galleryNo: string | null;
  worksLabel: string;
  backLabel: string;
  backHref: string;
  onBack?: () => void;
  accentColor: string | null;
}) {
  return (
    <div className={`sorter-plate sorter-plate--${variant}`}>
      <BackControl
        onBack={onBack}
        backHref={backHref}
        backLabel={backLabel}
        galleryNo={galleryNo}
      />
      <div className="plate-name" title={galleryTitle}>
        {galleryTitle}
      </div>
      <div className="plate-tag">ILLUMINATED</div>
      <div className="plate-works">{worksLabel}</div>
      <div className="plate-bottom">
        SLIDE
        <br />
        SORTER
      </div>
    </div>
  );
}

function BackControl({
  onBack,
  backHref,
  backLabel,
  galleryNo,
}: {
  onBack?: () => void;
  backHref: string;
  backLabel: string;
  galleryNo: string | null;
}) {
  const inner = (
    <>
      <svg
        className="plate-back-arrow"
        viewBox="0 0 20 14"
        aria-hidden
        fill="none"
      >
        <path
          d="M 1 7 L 18 7 M 6 2 L 1 7 L 6 12"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      {galleryNo && <span className="plate-back-no">No.{galleryNo}</span>}
    </>
  );
  if (onBack) {
    return (
      <button
        type="button"
        className="plate-back"
        onClick={onBack}
        aria-label={backLabel}
        title={backLabel}
      >
        {inner}
      </button>
    );
  }
  return (
    <Link
      href={backHref}
      className="plate-back"
      aria-label={backLabel}
      title={backLabel}
    >
      {inner}
    </Link>
  );
}

// FNV-1a hash → row index. Deterministic so row assignment is stable across
// re-renders; distribution across 3 buckets is near-uniform for normal ids.
function hashToRow(id: string, n: number): number {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) % n;
}

// FNV-1a hash → float in [0, 1). Seeded so the same id can yield different
// streams for margin jitter, tilt variation, etc.
function hashFloat(id: string, seed: number): number {
  let h = (2166136261 ^ seed) >>> 0;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 100000) / 100000;
}

function HallTokens() {
  return (
    <style>{`
      .hall-ex {
        --ex-paper: #ffffff;
        --ex-paper-room: #fafaf8;
        --ex-paper-hover: #ffffff;
        --ex-ink: #2a2620;
        --ex-ink-soft: #6b6258;
        --ex-ink-faint: #c9c4bb;
        --ex-accent: #b8824a;
      }
    `}</style>
  );
}
