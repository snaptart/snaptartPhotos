"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import FieldMap from "@/components/public/fieldmap/FieldMap";
import RoomView, { type RoomPhoto } from "@/components/public/hall/RoomView";
import { projectLatLngToScreen } from "@/lib/fieldmap/map";
import type { FieldMapData } from "@/lib/fieldmap/query";
import type { MapStyle } from "@/components/public/fieldmap/types";

type RegionPageClientProps = {
  fieldMapData: FieldMapData;
  mapStyle: MapStyle;
  siteTitle: string;
  slug: string;
  galleryTitle: string;
  tagline: string;
  accentColor: string | null;
  latitude: number | null;
  longitude: number | null;
  photos: RoomPhoto[];
  captionFields?: readonly string[];
  filmStamp?: string | null;
  handwritingFont?: string | null;
  stampFont?: string | null;
};

const ANIM_MS = 900;
const EASE = "cubic-bezier(0.2, 0.8, 0.2, 1)";

const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

// Returns the pin's on-screen position in viewport (window) coordinates,
// accounting for the site header above and footer below the field map.
// Header and footer are still in the DOM on the room page (just behind the
// content area visually), so we can measure them.
function projectPinOnHomeScreen(
  latitude: number,
  longitude: number
): { x: number; y: number } | null {
  if (typeof window === "undefined") return null;
  const header = document.querySelector("header");
  const footer = document.querySelector("footer");
  const navH = header?.getBoundingClientRect().height ?? 0;
  const footerH = footer?.getBoundingClientRect().height ?? 0;
  const mapW = window.innerWidth;
  const mapH = Math.max(0, window.innerHeight - navH - footerH);
  const pin = projectLatLngToScreen(latitude, longitude, mapW, mapH);
  return pin ? { x: pin.x, y: pin.y + navH } : null;
}

type AnimState = "pre-enter" | "entering" | "resting" | "leaving";

export default function RegionPageClient({
  fieldMapData,
  mapStyle,
  siteTitle,
  slug,
  galleryTitle,
  tagline,
  accentColor,
  latitude,
  longitude,
  photos,
  captionFields,
  filmStamp,
  handwritingFont,
  stampFont,
}: RegionPageClientProps) {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [animState, setAnimState] = useState<AnimState>("pre-enter");
  const [origin, setOrigin] = useState<{ x: number; y: number } | null>(null);
  const [viewport, setViewport] = useState<{ w: number; h: number }>({ w: 0, h: 0 });

  // Compute origin + viewport synchronously before first paint so the
  // initial frame shows the shrunk room at the pin, not the full-size room.
  // Origin and viewport are expressed in container-local coords (the flex-1
  // content area between navbar and footer), not window coords.
  useIsomorphicLayoutEffect(() => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    let chosenVp: { x: number; y: number } | null = null;
    try {
      const stored = sessionStorage.getItem(`fieldmap-origin-${slug}`);
      if (stored) {
        chosenVp = JSON.parse(stored) as { x: number; y: number };
        sessionStorage.removeItem(`fieldmap-origin-${slug}`);
      }
    } catch {}
    if (!chosenVp && latitude != null && longitude != null) {
      chosenVp = projectPinOnHomeScreen(latitude, longitude);
    }
    const chosen = chosenVp
      ? { x: chosenVp.x - rect.left, y: chosenVp.y - rect.top }
      : null;

    setViewport({ w: rect.width, h: rect.height });
    setOrigin(chosen ?? { x: rect.width / 2, y: rect.height / 2 });

    // After browser paints the pre-enter frame, flip to entering.
    const raf = requestAnimationFrame(() => setAnimState("entering"));
    return () => cancelAnimationFrame(raf);
  }, [slug, latitude, longitude]);

  // After the enter transition completes, mark as resting (no transition)
  // so subsequent style changes don't animate unexpectedly.
  useEffect(() => {
    if (animState !== "entering") return;
    const t = setTimeout(() => setAnimState("resting"), ANIM_MS + 40);
    return () => clearTimeout(t);
  }, [animState]);

  const handleClose = () => {
    if (animState === "leaving") return;
    // Recompute origin from the current container + region coords so the
    // room shrinks to where the pin currently sits (handles viewport
    // resize while open).
    const rect = containerRef.current?.getBoundingClientRect();
    if (rect) {
      if (latitude != null && longitude != null) {
        const fresh = projectPinOnHomeScreen(latitude, longitude);
        if (fresh) setOrigin({ x: fresh.x - rect.left, y: fresh.y - rect.top });
      }
      setViewport({ w: rect.width, h: rect.height });
    }
    setAnimState("leaving");
    setTimeout(() => router.push("/"), ANIM_MS);
  };

  const cx = viewport.w / 2;
  const cy = viewport.h / 2;
  const shrunkStr =
    origin && viewport.w > 0
      ? `translate(${origin.x - cx}px, ${origin.y - cy}px) scale(0.05)`
      : "none";

  let transform = "none";
  let transition: string | undefined;
  let opacity = 1;
  if (animState === "pre-enter") {
    transform = shrunkStr;
    transition = "none";
  } else if (animState === "entering") {
    transform = "none";
    transition = `transform ${ANIM_MS}ms ${EASE}`;
  } else if (animState === "leaving") {
    transform = shrunkStr;
    transition = `transform ${ANIM_MS}ms ${EASE}, opacity ${Math.round(ANIM_MS * 0.85)}ms ease-out`;
    opacity = 0;
  }

  return (
    <div ref={containerRef} className="relative flex-1 overflow-hidden">
      {/* faded field map behind. Filter/opacity live on this wrapper so
          they can animate in parallel with the room-shrink on close. */}
      <div
        className="absolute inset-0 z-30"
        style={{
          filter: animState === "leaving" ? "blur(0px) saturate(1)" : "blur(10px) saturate(0.75)",
          opacity: animState === "leaving" ? 1 : 0.55,
          transition: `filter ${ANIM_MS}ms ${EASE}, opacity ${ANIM_MS}ms ${EASE}`,
        }}
      >
        <FieldMap
          regions={fieldMapData.regions}
          yearBounds={fieldMapData.yearBounds}
          filters={fieldMapData.filters}
          mapStyle={mapStyle}
          siteTitle={siteTitle}
          mode="background"
          highlightSlug={slug}
        />
      </div>

      {/* room overlay — --ex-paper override makes RoomView's inner wrapper
          transparent so the faded field map below shows through. */}
      <div
        className="hall-ex absolute inset-0 z-40 overflow-hidden"
        style={
          {
            transformOrigin: "center center",
            transform,
            transition,
            opacity,
            willChange: "transform, opacity",
            "--ex-paper": "transparent",
          } as React.CSSProperties
        }
      >
        <RoomView
          galleryTitle={galleryTitle}
          gallerySlug={slug}
          tagline={tagline}
          accentColor={accentColor}
          photos={photos}
          captionFields={captionFields}
          filmStamp={filmStamp}
          handwritingFont={handwritingFont}
          stampFont={stampFont}
          backHref="/"
          backLabel="Back to map"
          returnLabel="Return to map"
          onBack={handleClose}
        />
      </div>
    </div>
  );
}
