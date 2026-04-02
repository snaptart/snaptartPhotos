"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { parseLinks } from "@/lib/parseLinks";

export interface LightboxPhoto {
  id: string;
  url: string;
  title: string | null;
  description: string | null;
  location: string | null;
  filename?: string | null;
  cameraSettings?: { camera?: string; lens?: string; iso?: string; aperture?: string; shutter?: string } | null;
  width: number;
  height: number;
}

export interface LightboxSettings {
  metadataFields: string[];
  cornerRadius: number;
  captionPosition: "below" | "overlay-top" | "overlay-bottom";
  fadeSpeed: "none" | "fast" | "medium" | "slow";
  captionAlignment: "left" | "center" | "right";
}

export const DEFAULT_LIGHTBOX_SETTINGS: LightboxSettings = {
  metadataFields: ["title", "location"],
  cornerRadius: 0,
  captionPosition: "below",
  fadeSpeed: "medium",
  captionAlignment: "left",
};

const SLIDE_MS = 300;
const FADE_SPEEDS = { none: 0, fast: 150, medium: 300, slow: 500 };

interface LightboxProps {
  photos: LightboxPhoto[];
  selectedIndex: number | null;
  onClose: () => void;
  settings?: LightboxSettings;
}

export default function Lightbox({ photos, selectedIndex, onClose, settings = DEFAULT_LIGHTBOX_SETTINGS }: LightboxProps) {
  const [displayIndex, setDisplayIndex] = useState(0);
  const [outgoingIndex, setOutgoingIndex] = useState<number | null>(null);
  const [crossfading, setCrossfading] = useState(false);
  const [slideDir, setSlideDir] = useState<"left" | "right" | null>(null);
  const [visible, setVisible] = useState(false);

  const navTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchStartRef = useRef({ x: 0, y: 0 });
  const prevSelectedRef = useRef<number | null>(null);

  const fadeMs = FADE_SPEEDS[settings.fadeSpeed] ?? 300;
  const lbRadius = settings.cornerRadius;
  const isOverlay = settings.captionPosition === "overlay-top" || settings.captionPosition === "overlay-bottom";
  const alignClass = { left: "text-left", center: "text-center", right: "text-right" }[settings.captionAlignment];

  // Sync when parent opens/changes the lightbox
  useEffect(() => {
    if (selectedIndex !== null && prevSelectedRef.current === null) {
      // Opening
      if (navTimer.current) clearTimeout(navTimer.current);
      if (closeTimer.current) clearTimeout(closeTimer.current);
      setDisplayIndex(selectedIndex);
      setOutgoingIndex(null);
      setCrossfading(false);
      setSlideDir(null);
      requestAnimationFrame(() => setVisible(true));
    }
    prevSelectedRef.current = selectedIndex;
  }, [selectedIndex]);

  // Cleanup timers
  useEffect(() => {
    return () => {
      if (navTimer.current) clearTimeout(navTimer.current);
      if (closeTimer.current) clearTimeout(closeTimer.current);
    };
  }, []);

  const closeLightbox = useCallback(() => {
    setVisible(false);
    closeTimer.current = setTimeout(() => onClose(), fadeMs);
  }, [fadeMs, onClose]);

  const navigateTo = useCallback((index: number, direction?: "left" | "right") => {
    if (navTimer.current) clearTimeout(navTimer.current);
    if (fadeMs === 0 && !direction) {
      setDisplayIndex(index);
      return;
    }
    const prev = displayIndex;
    setOutgoingIndex(prev);
    setDisplayIndex(index);

    if (direction) {
      setSlideDir(direction);
      setCrossfading(false);
      navTimer.current = setTimeout(() => {
        setOutgoingIndex(null);
        setSlideDir(null);
      }, SLIDE_MS + 50);
    } else {
      setSlideDir(null);
      setCrossfading(false);
      requestAnimationFrame(() => requestAnimationFrame(() => {
        setCrossfading(true);
      }));
      navTimer.current = setTimeout(() => {
        setOutgoingIndex(null);
        setCrossfading(false);
      }, fadeMs + 50);
    }
  }, [fadeMs, displayIndex]);

  // Keyboard navigation
  useEffect(() => {
    if (selectedIndex === null) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeLightbox();
      if (e.key === "ArrowLeft") navigateTo((displayIndex - 1 + photos.length) % photos.length);
      if (e.key === "ArrowRight") navigateTo((displayIndex + 1) % photos.length);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedIndex, displayIndex, photos.length, closeLightbox, navigateTo]);

  if (selectedIndex === null) return null;

  const incomingOpacity = outgoingIndex === null || crossfading ? 1 : 0;

  const renderCaption = (p: LightboxPhoto) => {
    const fields = settings.metadataFields;
    const hasCaption = fields.length > 0 && (
      (fields.includes("title") && p.title) ||
      (fields.includes("description") && p.description) ||
      (fields.includes("location") && p.location) ||
      (fields.includes("camera") && p.cameraSettings) ||
      (fields.includes("filename") && p.filename)
    );
    if (!hasCaption) return null;
    return (
      <>
        {fields.includes("title") && p.title && <p className="text-base" style={{ fontFamily: "var(--theme-font-captions)", color: "var(--theme-color-lightbox-text)" }}>{parseLinks(p.title)}</p>}
        {fields.includes("description") && p.description && <p className="text-sm" style={{ color: "var(--theme-color-lightbox-text)", opacity: 0.8 }}>{parseLinks(p.description)}</p>}
        {fields.includes("location") && p.location && <p className="text-sm" style={{ color: "var(--theme-color-lightbox-text)", opacity: 0.6 }}>{parseLinks(p.location)}</p>}
        {fields.includes("camera") && p.cameraSettings && (
          <p className="text-xs" style={{ color: "var(--theme-color-lightbox-text)", opacity: 0.4 }}>
            {[p.cameraSettings.camera, p.cameraSettings.lens, p.cameraSettings.aperture, p.cameraSettings.shutter, p.cameraSettings.iso ? `ISO ${p.cameraSettings.iso}` : null].filter(Boolean).join(" \u00b7 ")}
          </p>
        )}
        {fields.includes("filename") && p.filename && <p className="text-xs" style={{ color: "var(--theme-color-lightbox-text)", opacity: 0.4 }}>{p.filename}</p>}
      </>
    );
  };

  const renderSlot = (idx: number, isOutgoing: boolean) => {
    const p = photos[idx];
    const caption = renderCaption(p);

    const imageAndCaption = (
      <>
        <div className="relative group">
          <img
            src={p.url}
            alt={p.title ?? ""}
            className="max-h-[80vh] max-w-full object-contain"
            style={{ borderRadius: lbRadius }}
          />
          {isOverlay && caption && (
            <div
              className={`absolute left-0 right-0 px-4 py-3 space-y-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 ${alignClass} ${
                settings.captionPosition === "overlay-top"
                  ? "top-0 bg-gradient-to-b from-black/70 to-transparent"
                  : "bottom-0 bg-gradient-to-t from-black/70 to-transparent"
              }`}
              style={settings.captionPosition === "overlay-top" ? { borderRadius: `${lbRadius}px ${lbRadius}px 0 0` } : { borderRadius: `0 0 ${lbRadius}px ${lbRadius}px` }}
            >
              {caption}
            </div>
          )}
        </div>
        {!isOverlay && caption && (
          <div className={`mt-3 space-y-0.5 w-full ${alignClass}`}>{caption}</div>
        )}
      </>
    );

    // Slide animation for swipe
    if (slideDir) {
      let animationName: string;
      if (isOutgoing) {
        animationName = slideDir === "left" ? "slideOutLeft" : "slideOutRight";
      } else {
        animationName = slideDir === "left" ? "slideInFromRight" : "slideInFromLeft";
      }
      return (
        <div
          key={`${isOutgoing ? "out" : "in"}-${idx}-${slideDir}`}
          style={{
            gridArea: "1/1",
            animation: `${animationName} ${SLIDE_MS}ms ease forwards`,
            pointerEvents: isOutgoing ? "none" : "auto",
          }}
          className="flex w-full flex-col items-center"
        >
          {imageAndCaption}
        </div>
      );
    }

    // Crossfade for desktop arrow/keyboard nav
    return (
      <div
        key={`${isOutgoing ? "out" : "in"}-${idx}`}
        style={{
          gridArea: "1/1",
          opacity: isOutgoing ? (crossfading ? 0 : 1) : incomingOpacity,
          transition: outgoingIndex !== null && fadeMs > 0 ? `opacity ${fadeMs}ms ease` : undefined,
          pointerEvents: isOutgoing ? "none" : "auto",
        }}
        className="flex w-full flex-col items-center"
      >
        {imageAndCaption}
      </div>
    );
  };

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes slideOutLeft { from { transform: translate3d(0,0,0); } to { transform: translate3d(-100%,0,0); } }
        @keyframes slideOutRight { from { transform: translate3d(0,0,0); } to { transform: translate3d(100%,0,0); } }
        @keyframes slideInFromRight { from { transform: translate3d(100%,0,0); } to { transform: translate3d(0,0,0); } }
        @keyframes slideInFromLeft { from { transform: translate3d(-100%,0,0); } to { transform: translate3d(0,0,0); } }
      `}} />

      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/95"
        style={{ opacity: visible ? 1 : 0, transition: fadeMs > 0 ? `opacity ${fadeMs}ms ease` : undefined }}
        onTouchStart={(e) => {
          touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        }}
        onTouchEnd={(e) => {
          const dx = e.changedTouches[0].clientX - touchStartRef.current.x;
          const dy = e.changedTouches[0].clientY - touchStartRef.current.y;
          if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) {
            if (dx < 0) navigateTo((displayIndex + 1) % photos.length, "left");
            else navigateTo((displayIndex - 1 + photos.length) % photos.length, "right");
          }
        }}
      >
        {/* Close */}
        <button onClick={closeLightbox} className="absolute right-4 top-4 text-3xl text-white/70 hover:text-white z-10">
          &times;
        </button>

        {/* Prev */}
        <button
          onClick={(e) => { e.stopPropagation(); navigateTo((displayIndex - 1 + photos.length) % photos.length); }}
          className="absolute left-4 text-4xl text-white/70 hover:text-white z-10 hidden sm:block"
        >
          &#8249;
        </button>

        {/* Image + caption */}
        <div
          className="max-h-[90vh] w-[95vw] sm:max-w-[90vw] overflow-hidden"
          style={{ display: "grid", alignItems: "center" }}
          onClick={(e) => e.stopPropagation()}
        >
          {outgoingIndex !== null && renderSlot(outgoingIndex, true)}
          {renderSlot(displayIndex, false)}
        </div>

        {/* Next */}
        <button
          onClick={(e) => { e.stopPropagation(); navigateTo((displayIndex + 1) % photos.length); }}
          className="absolute right-4 text-4xl text-white/70 hover:text-white z-10 hidden sm:block"
        >
          &#8250;
        </button>
      </div>
    </>
  );
}
