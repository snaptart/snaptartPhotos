"use client";

import { useState, useRef, useCallback, useEffect, type CSSProperties } from "react";
import { getImageProps } from "next/image";
import { parseLinks } from "@/lib/parseLinks";

export interface LightboxPhoto {
  id: string;
  url: string;
  /** The small copy the grids show; stands in while the full photograph loads. */
  thumbnailUrl?: string | null;
  title: string | null;
  description: string | null;
  location: string | null;
  filename?: string | null;
  cameraSettings?: { camera?: string; lens?: string; iso?: string; aperture?: string; shutter?: string } | null;
  takenAt?: Date | string | null;
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
  metadataFields: ["title", "description"],
  cornerRadius: 0,
  captionPosition: "below",
  fadeSpeed: "medium",
  captionAlignment: "left",
};

const SLIDE_MS = 300;
const FADE_SPEEDS = { none: 0, fast: 150, medium: 300, slow: 500 };

/** "September 2020". takenAt is stored as UTC-of-wall-clock, so read it in UTC. */
export function photoDate(takenAt: LightboxPhoto["takenAt"]): string | null {
  if (!takenAt) return null;
  const d = takenAt instanceof Date ? takenAt : new Date(takenAt);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
}

export function exposureLine(c: LightboxPhoto["cameraSettings"]): string | null {
  if (!c) return null;
  const line = [c.camera, c.lens, c.aperture, c.shutter, c.iso ? `ISO ${c.iso}` : null].filter(Boolean).join(" · ");
  return line || null;
}

const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);

/** Roughly the width the photograph gets: the screen, less the arrow gutters above the phone breakpoint. */
const LIGHTBOX_SIZES = "(min-width: 640px) calc(100vw - 248px), 100vw";
const OPTIMIZABLE = /^https:\/\/[^/]+\.public\.blob\.vercel-storage\.com\//;

/**
 * The photograph through the image optimizer, sized to the screen: a phone gets a
 * few hundred KB of WebP instead of the multi-MB original. Hosts the optimizer
 * isn't configured for (next.config.ts) get the original.
 */
function lightboxSource(p: LightboxPhoto): { src: string; srcSet?: string; sizes?: string } {
  if (!OPTIMIZABLE.test(p.url) || !(p.width > 0 && p.height > 0)) return { src: p.url };
  const { props } = getImageProps({ src: p.url, alt: "", width: p.width, height: p.height, sizes: LIGHTBOX_SIZES });
  return { src: props.src, srcSet: props.srcSet, sizes: props.sizes };
}

/** How far a double tap enlarges the photograph, and the most a pinch may. */
const ZOOM = 2.5;
const MAX_ZOOM = 5;
/** Two taps closer than this (ms, px) are a double tap. */
const DOUBLE_TAP_MS = 300;
const DOUBLE_TAP_PX = 40;

/** Scale, and the offset of the photo's centre, applied as translate() scale() about that centre. */
type Zoom = { s: number; x: number; y: number };
/** The box a zoomed photo is clipped to, and the centre it rests at when it fits. */
type Frame = { box: DOMRect; cx: number; cy: number };

/**
 * The zoom brought within bounds: no smaller than the photo's own size, and an
 * enlarged photo always covering its frame, so a drag can't pull an edge inside
 * it. `img` is the photo's unenlarged box.
 */
function clampZoom(z: Zoom, img: DOMRect, frame: Frame): Zoom {
  const s = Math.min(MAX_ZOOM, Math.max(1, z.s));
  const axis = (t: number, start: number, size: number, frameStart: number, frameSize: number, rest: number) => {
    const scaled = size * s;
    const centre = start + size / 2;
    if (scaled <= frameSize) return rest - centre;
    const min = frameStart + frameSize - scaled / 2 - centre;
    const max = frameStart + scaled / 2 - centre;
    return Math.min(max, Math.max(min, t));
  };
  return {
    s,
    x: axis(z.x, img.left, img.width, frame.box.left, frame.box.width, frame.cx),
    y: axis(z.y, img.top, img.height, frame.box.top, frame.box.height, frame.cy),
  };
}

const NO_ZOOM: Zoom = { s: 1, x: 0, y: 0 };
const touchDistance = (a: React.Touch, b: React.Touch) => Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);

/** The visitor's details on/off choice, remembered between visits. */
const DETAILS_KEY = "lightbox-details";
/** A phone turned on its side: the photograph gets the whole screen. */
const PHONE_LANDSCAPE = "(orientation: landscape) and (max-height: 500px)";

/*
 * Colours follow the Photo board: a warm near-black scrim, paper-white text,
 * and the quieter greys (meta, hairlines, button rings) mixed from those two so
 * a preset that changes either still reads as one family.
 */
const SCRIM_VARS = {
  "--lb-bg": "var(--theme-color-lightbox-bg, #14130F)",
  "--lb-text": "var(--theme-color-lightbox-text, #FBFAF8)",
  "--lb-muted": "color-mix(in srgb, var(--lb-text) 62%, var(--lb-bg))",
  "--lb-hint": "color-mix(in srgb, var(--lb-text) 36%, var(--lb-bg))",
  "--lb-ring": "color-mix(in srgb, var(--lb-text) 22%, var(--lb-bg))",
  "--lb-rule": "color-mix(in srgb, var(--lb-text) 12%, var(--lb-bg))",
} as CSSProperties;

const BODY_FONT: CSSProperties = { fontFamily: "var(--theme-font-body-family)" };
const ROUND_BUTTON =
  "flex shrink-0 items-center justify-center rounded-full border border-[var(--lb-ring)] bg-transparent transition-colors hover:border-[var(--lb-muted)] focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-[var(--lb-muted)]";

interface LightboxProps {
  photos: LightboxPhoto[];
  selectedIndex: number | null;
  onClose: () => void;
  settings?: LightboxSettings;
  /** Shown after the counter ("03 / 12 · North Shore"). */
  collectionTitle?: string | null;
}

export default function Lightbox({ photos, selectedIndex, onClose, settings = DEFAULT_LIGHTBOX_SETTINGS, collectionTitle }: LightboxProps) {
  const [displayIndex, setDisplayIndex] = useState(0);
  const [outgoingIndex, setOutgoingIndex] = useState<number | null>(null);
  const [crossfading, setCrossfading] = useState(false);
  const [slideDir, setSlideDir] = useState<"left" | "right" | null>(null);
  const [visible, setVisible] = useState(false);

  const navTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevSelectedRef = useRef<number | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const [showDetails, setShowDetails] = useState(() => {
    try {
      return localStorage.getItem(DETAILS_KEY) !== "off";
    } catch {
      return true;
    }
  });
  const [phoneLandscape, setPhoneLandscape] = useState(false);
  // On a phone on its side the controls stay out of the way until the photo is tapped.
  const [controlsShown, setControlsShown] = useState(false);
  const controlsTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // The caption's rule runs the width of the photograph above it, as on the board.
  const [imgWidths, setImgWidths] = useState<Record<number, number>>({});
  const resizeObserver = useRef<ResizeObserver | null>(null);

  const observeImage = useCallback((el: HTMLImageElement | null) => {
    if (!el || typeof ResizeObserver === "undefined") return;
    resizeObserver.current ??= new ResizeObserver((entries) => {
      setImgWidths((prev) => {
        let next = prev;
        for (const entry of entries) {
          const idx = Number((entry.target as HTMLElement).dataset.idx);
          const w = Math.round(entry.contentRect.width);
          if (w > 0 && prev[idx] !== w) {
            if (next === prev) next = { ...prev };
            next[idx] = w;
          }
        }
        return next;
      });
    });
    const ro = resizeObserver.current;
    ro.observe(el);
    return () => ro.unobserve(el);
  }, []);

  const fadeMs = FADE_SPEEDS[settings.fadeSpeed] ?? 300;
  const lbRadius = settings.cornerRadius;
  const isOverlay = settings.captionPosition === "overlay-top" || settings.captionPosition === "overlay-bottom";
  const align = settings.captionAlignment;
  const alignClass = { left: "text-left", center: "text-center", right: "text-right" }[align];
  const many = photos.length > 1;

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
      requestAnimationFrame(() => {
        setVisible(true);
        closeButtonRef.current?.focus({ preventScroll: true });
      });
    }
    prevSelectedRef.current = selectedIndex;
  }, [selectedIndex]);

  // Cleanup timers
  useEffect(() => {
    return () => {
      if (navTimer.current) clearTimeout(navTimer.current);
      if (closeTimer.current) clearTimeout(closeTimer.current);
      if (controlsTimer.current) clearTimeout(controlsTimer.current);
      resizeObserver.current?.disconnect();
    };
  }, []);

  useEffect(() => {
    const mq = window.matchMedia(PHONE_LANDSCAPE);
    const sync = () => {
      setPhoneLandscape(mq.matches);
      setControlsShown(false);
    };
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  const toggleDetails = useCallback(() => {
    setShowDetails((on) => {
      try {
        localStorage.setItem(DETAILS_KEY, on ? "off" : "on");
      } catch {}
      return !on;
    });
  }, []);

  // Once a photograph is in, fetch its neighbours so the next swipe is instant.
  const preloaded = useRef(new Set<string>());
  const preloadAround = (idx: number) => {
    const n = photos.length;
    if (n < 2) return;
    for (const i of [(idx + 1) % n, (idx - 1 + n) % n]) {
      const s = lightboxSource(photos[i]);
      const key = s.srcSet ?? s.src;
      if (preloaded.current.has(key)) continue;
      preloaded.current.add(key);
      const img = new Image();
      if (s.sizes) img.sizes = s.sizes;
      if (s.srcSet) img.srcset = s.srcSet;
      img.src = s.src;
    }
  };

  const toggleControls = useCallback(() => {
    if (controlsTimer.current) clearTimeout(controlsTimer.current);
    setControlsShown((shown) => {
      if (!shown) controlsTimer.current = setTimeout(() => setControlsShown(false), 4000);
      return !shown;
    });
  }, []);

  // Zoom (touch screens): double tap, or pinch, about the fingers; drag to look around.
  const [zoom, setZoomState] = useState<Zoom | null>(null);
  // Touch handlers read this, not `zoom`: moves are batched, so the rendered value can lag the fingers.
  const zoomNow = useRef<Zoom | null>(null);
  const setZoom = (z: Zoom | null) => {
    zoomNow.current = z;
    setZoomState(z);
  };
  const [gesturing, setGesturing] = useState(false);
  const stageRef = useRef<HTMLDivElement>(null);
  // The photo's box before any zoom, taken when a zoom starts.
  const zoomBase = useRef<{ img: DOMRect; frame: Frame } | null>(null);
  const gesture = useRef<{ x: number; y: number; start: Zoom; pinch: { d: number; mx: number; my: number } | null; wasMulti: boolean }>({
    x: 0,
    y: 0,
    start: NO_ZOOM,
    pinch: null,
    wasMulti: false,
  });
  const lastTap = useRef<{ t: number; x: number; y: number } | null>(null);
  const tapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTouchAt = useRef(0);

  useEffect(() => {
    setZoom(null);
    setGesturing(false);
  }, [displayIndex, selectedIndex, phoneLandscape]);

  useEffect(() => () => {
    if (tapTimer.current) clearTimeout(tapTimer.current);
  }, []);

  const measure = () => {
    if (zoomNow.current && zoomBase.current) return zoomBase.current;
    const img = stageRef.current?.querySelector<HTMLImageElement>(`img[data-idx="${displayIndex}"]`);
    const frameEl = img?.parentElement?.parentElement;
    if (!img || !frameEl) return null;
    const box = frameEl.getBoundingClientRect();
    const cs = getComputedStyle(frameEl);
    const [pl, pr, pt, pb] = [cs.paddingLeft, cs.paddingRight, cs.paddingTop, cs.paddingBottom].map(parseFloat);
    zoomBase.current = {
      img: img.getBoundingClientRect(),
      frame: { box, cx: box.left + pl + (box.width - pl - pr) / 2, cy: box.top + pt + (box.height - pt - pb) / 2 },
    };
    return zoomBase.current;
  };

  /** The zoom that scales `from` to `s`, keeping the photo point that was under (ax, ay) under (x, y). */
  const zoomAbout = (from: Zoom, s: number, ax: number, ay: number, x: number, y: number, base: { img: DOMRect; frame: Frame }) => {
    const cx = base.img.left + base.img.width / 2;
    const cy = base.img.top + base.img.height / 2;
    const k = Math.min(MAX_ZOOM, Math.max(1, s)) / from.s;
    return clampZoom({ s, x: x - cx - (ax - cx - from.x) * k, y: y - cy - (ay - cy - from.y) * k }, base.img, base.frame);
  };

  const toggleZoomAt = (x: number, y: number) => {
    if (zoomNow.current) {
      setZoom(null);
      return;
    }
    const base = measure();
    if (!base) return;
    const r = base.img;
    if (x < r.left || x > r.right || y < r.top || y > r.bottom) return;
    setZoom(zoomAbout(NO_ZOOM, ZOOM, x, y, x, y, base));
  };

  const onTouchStart = (e: React.TouchEvent) => {
    lastTouchAt.current = Date.now();
    if (e.touches.length >= 2) {
      const base = measure();
      if (!base) return;
      const [a, b] = [e.touches[0], e.touches[1]];
      gesture.current = {
        ...gesture.current,
        start: zoomNow.current ?? NO_ZOOM,
        pinch: { d: touchDistance(a, b), mx: (a.clientX + b.clientX) / 2, my: (a.clientY + b.clientY) / 2 },
        wasMulti: true,
      };
      lastTap.current = null;
      if (tapTimer.current) clearTimeout(tapTimer.current);
      return;
    }
    const t = e.touches[0];
    gesture.current = { x: t.clientX, y: t.clientY, start: zoomNow.current ?? NO_ZOOM, pinch: null, wasMulti: false };
  };

  const onTouchMove = (e: React.TouchEvent) => {
    const g = gesture.current;
    const base = zoomBase.current;
    if (g.pinch && e.touches.length >= 2 && base) {
      const [a, b] = [e.touches[0], e.touches[1]];
      const s = (g.start.s * touchDistance(a, b)) / g.pinch.d;
      setGesturing(true);
      setZoom(zoomAbout(g.start, s, g.pinch.mx, g.pinch.my, (a.clientX + b.clientX) / 2, (a.clientY + b.clientY) / 2, base));
      return;
    }
    const current = zoomNow.current;
    if (!current || g.pinch || e.touches.length > 1 || !base) return;
    const t = e.touches[0];
    setGesturing(true);
    setZoom(clampZoom({ s: current.s, x: g.start.x + t.clientX - g.x, y: g.start.y + t.clientY - g.y }, base.img, base.frame));
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    lastTouchAt.current = Date.now();
    const g = gesture.current;
    if (e.touches.length > 0) {
      // One finger lifted from a pinch: carry on as a drag with the other.
      if (g.pinch && e.touches.length === 1) {
        const t = e.touches[0];
        gesture.current = { x: t.clientX, y: t.clientY, start: zoomNow.current ?? NO_ZOOM, pinch: null, wasMulti: true };
      }
      return;
    }
    setGesturing(false);
    if (g.wasMulti) {
      // Pinched back to (about) its own size: out of zoom.
      if (zoomNow.current && zoomNow.current.s < 1.05) setZoom(null);
      gesture.current = { ...g, pinch: null, wasMulti: false };
      return;
    }
    const t = e.changedTouches[0];
    const dx = t.clientX - g.x;
    const dy = t.clientY - g.y;
    if (Math.hypot(dx, dy) > 10) {
      // A drag: looks around a zoomed photo, otherwise a swipe to the next one.
      if (!zoomNow.current && many && Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) {
        if (dx < 0) navigateTo((displayIndex + 1) % photos.length, "left");
        else navigateTo((displayIndex - 1 + photos.length) % photos.length, "right");
      }
      return;
    }
    if (!stageRef.current?.contains(e.target as Node)) return;
    const now = Date.now();
    const prev = lastTap.current;
    if (prev && now - prev.t < DOUBLE_TAP_MS && Math.hypot(t.clientX - prev.x, t.clientY - prev.y) < DOUBLE_TAP_PX) {
      lastTap.current = null;
      if (tapTimer.current) clearTimeout(tapTimer.current);
      e.preventDefault(); // no click after it
      toggleZoomAt(t.clientX, t.clientY);
      return;
    }
    lastTap.current = { t: now, x: t.clientX, y: t.clientY };
    // On a phone on its side a single tap shows the controls, once it's clear no second tap is coming.
    if (phoneLandscape) {
      if (tapTimer.current) clearTimeout(tapTimer.current);
      tapTimer.current = setTimeout(toggleControls, DOUBLE_TAP_MS);
    }
  };

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

  const goPrev = useCallback(() => navigateTo((displayIndex - 1 + photos.length) % photos.length), [navigateTo, displayIndex, photos.length]);
  const goNext = useCallback(() => navigateTo((displayIndex + 1) % photos.length), [navigateTo, displayIndex, photos.length]);

  // Keyboard navigation
  useEffect(() => {
    if (selectedIndex === null) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeLightbox();
      if ((e.key === "i" || e.key === "I") && !e.metaKey && !e.ctrlKey && !e.altKey) toggleDetails();
      if (!many) return;
      if (e.key === "ArrowLeft") goPrev();
      if (e.key === "ArrowRight") goNext();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedIndex, many, closeLightbox, goPrev, goNext, toggleDetails]);

  if (selectedIndex === null) return null;

  const incomingOpacity = outgoingIndex === null || crossfading ? 1 : 0;
  // Phone on its side: just the photograph, edge to edge.
  const bare = phoneLandscape;
  const hasDetails = settings.metadataFields.length > 0;
  const detailsOn = showDetails && hasDetails && !bare;

  const renderCaption = (p: LightboxPhoto) => {
    const fields = settings.metadataFields;
    const place = [
      fields.includes("location") ? p.location : null,
      fields.includes("date") ? photoDate(p.takenAt) : null,
    ].filter(Boolean) as string[];
    const exposure = fields.includes("camera") ? exposureLine(p.cameraSettings) : null;
    const title = fields.includes("title") ? p.title : null;
    const description = fields.includes("description") ? p.description : null;
    const filename = fields.includes("filename") ? p.filename : null;
    if (!title && !description && place.length === 0 && !exposure && !filename) return null;

    const muted = { color: "var(--lb-muted)" };
    return (
      <>
        {title && (
          <h2 className="theme-text-collection-title m-0" style={{ color: "var(--lb-text)" }}>
            {parseLinks(title)}
          </h2>
        )}
        {description && (
          <p className="mt-2.5 max-w-[60ch] text-[14px] leading-relaxed" style={{ ...BODY_FONT, color: "color-mix(in srgb, var(--lb-text) 82%, var(--lb-bg))" }}>
            {parseLinks(description)}
          </p>
        )}
        {place.length > 0 && (
          <p className="theme-text-meta mt-2.5" style={muted}>
            {place.map((part, i) => (
              <span key={i}>
                {i > 0 && " · "}
                {parseLinks(part)}
              </span>
            ))}
          </p>
        )}
        {exposure && (
          <p className="mt-3 text-[12px] tracking-[0.04em]" style={{ ...BODY_FONT, ...muted }}>
            {exposure}
          </p>
        )}
        {filename && (
          <p className="mt-2 text-[12px] tracking-[0.04em]" style={{ ...BODY_FONT, ...muted }}>
            {filename}
          </p>
        )}
      </>
    );
  };

  const renderSlot = (idx: number, isOutgoing: boolean) => {
    const p = photos[idx];
    // Kept mounted while hidden, so switching details folds it away rather than cutting it.
    const caption = bare ? null : renderCaption(p);
    const source = lightboxSource(p);
    const zoomed = !isOutgoing && idx === displayIndex && zoom !== null;
    const sized = p.width > 0 && p.height > 0;
    // Sized from the photo's proportions rather than its pixels, so the box is right before the
    // file arrives and eases to its new size when the details open or close.
    const imgStyle: CSSProperties = sized
      ? {
          width: `min(${p.width}px, calc((100dvh - var(--lb-reserve)) * ${p.width / p.height}))`,
          aspectRatio: `${p.width} / ${p.height}`,
        }
      : { maxHeight: "calc(100dvh - var(--lb-reserve))" };
    const placeholder = p.thumbnailUrl && p.thumbnailUrl !== p.url
      ? { backgroundImage: `url(${JSON.stringify(p.thumbnailUrl)})`, backgroundSize: "contain", backgroundPosition: "center", backgroundRepeat: "no-repeat" }
      : null;

    const content = (
      <>
        <div
          className={`flex min-h-0 min-w-0 flex-1 items-center justify-center overflow-hidden ${bare ? "" : "px-4 pt-3 sm:px-[124px] sm:pt-[18px]"}`}
          style={{ touchAction: "none" }}
          onClick={bare ? () => Date.now() - lastTouchAt.current > 700 && toggleControls() : undefined}
        >
          <div
            className="group relative min-w-0 max-w-full"
            style={
              isOutgoing
                ? undefined
                : {
                    transform: zoomed ? `translate(${zoom.x}px, ${zoom.y}px) scale(${zoom.s})` : "none",
                    transition: gesturing ? "none" : "transform 250ms ease-out",
                  }
            }
          >
            <img
              ref={observeImage}
              data-idx={idx}
              src={source.src}
              srcSet={source.srcSet}
              sizes={zoomed && source.sizes ? `${ZOOM * 100}vw` : source.sizes}
              alt={p.title ?? ""}
              decoding="async"
              fetchPriority={isOutgoing ? "low" : "high"}
              onLoad={isOutgoing ? undefined : () => preloadAround(idx)}
              className="block h-auto max-w-full object-contain motion-safe:transition-[width] motion-safe:duration-300 motion-safe:ease-out"
              style={{ ...imgStyle, ...placeholder, borderRadius: bare ? 0 : lbRadius }}
            />
            {isOverlay && caption && detailsOn && (
              <div
                className={`absolute left-0 right-0 px-5 py-4 opacity-0 transition-opacity duration-300 group-hover:opacity-100 ${alignClass} ${
                  settings.captionPosition === "overlay-top"
                    ? "top-0 bg-gradient-to-b from-black/75 to-transparent"
                    : "bottom-0 bg-gradient-to-t from-black/75 to-transparent"
                }`}
                style={settings.captionPosition === "overlay-top" ? { borderRadius: `${lbRadius}px ${lbRadius}px 0 0` } : { borderRadius: `0 0 ${lbRadius}px ${lbRadius}px` }}
              >
                {caption}
              </div>
            )}
          </div>
        </div>
        {!isOverlay && caption && (
          <div
            className="grid motion-safe:transition-[grid-template-rows,opacity] motion-safe:duration-300 motion-safe:ease-out"
            style={{ gridTemplateRows: detailsOn ? "1fr" : "0fr", opacity: detailsOn ? 1 : 0 }}
            inert={!detailsOn}
          >
            <div className="min-h-0 overflow-hidden">
              <div className="flex justify-center px-4 pb-5 pt-5 sm:px-10 sm:pb-[34px] sm:pt-[34px]">
                <div
                  className={`w-full max-w-full border-t pt-4 sm:pt-[22px] ${alignClass}`}
                  style={{ borderColor: "var(--lb-rule)", width: imgWidths[idx] ? Math.max(imgWidths[idx], 360) : 900 }}
                >
                  {caption}
                </div>
              </div>
            </div>
          </div>
        )}
      </>
    );

    const slotClass = "flex h-full min-h-0 min-w-0 w-full flex-col";

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
          className={slotClass}
          aria-hidden={isOutgoing || undefined}
        >
          {content}
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
        className={slotClass}
        aria-hidden={isOutgoing || undefined}
      >
        {content}
      </div>
    );
  };

  // Room the image leaves for the bars around it; a caption below needs more.
  const captionBelow = !isOverlay && detailsOn;
  const reserve = bare
    ? "[--lb-reserve:0px]"
    : captionBelow
      ? "[--lb-reserve:210px] sm:[--lb-reserve:310px]"
      : "[--lb-reserve:90px] sm:[--lb-reserve:150px]";

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes slideOutLeft { from { transform: translate3d(0,0,0); } to { transform: translate3d(-100%,0,0); } }
        @keyframes slideOutRight { from { transform: translate3d(0,0,0); } to { transform: translate3d(100%,0,0); } }
        @keyframes slideInFromRight { from { transform: translate3d(100%,0,0); } to { transform: translate3d(0,0,0); } }
        @keyframes slideInFromLeft { from { transform: translate3d(-100%,0,0); } to { transform: translate3d(0,0,0); } }
      `}} />

      <div
        role="dialog"
        aria-modal="true"
        aria-label={collectionTitle ? `${collectionTitle} — photographs` : "Photograph"}
        className={`fixed inset-0 z-50 flex flex-col overflow-x-hidden ${bare ? "overflow-y-hidden" : "overflow-y-auto"} ${reserve}`}
        style={{
          ...SCRIM_VARS,
          background: "var(--lb-bg)",
          color: "var(--lb-text)",
          opacity: visible ? 1 : 0,
          transition: fadeMs > 0 ? `opacity ${fadeMs}ms ease` : undefined,
        } as CSSProperties}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {/* Counter, details toggle, close. On a phone on its side: only after a tap, over the photo. */}
        {(!bare || controlsShown) && (
          <div
            className={
              bare
                ? "absolute inset-x-0 top-0 z-20 flex items-center justify-between gap-4 bg-gradient-to-b from-[var(--lb-bg)] to-transparent px-4 pb-8 pt-3"
                : "flex shrink-0 items-center justify-between gap-4 px-4 pt-4 sm:px-10 sm:pt-[26px]"
            }
          >
            <span className="min-w-0 truncate text-[12px] tracking-[0.16em]" style={{ ...BODY_FONT, color: "var(--lb-muted)" }}>
              {many && `${pad(displayIndex + 1)} / ${pad(photos.length)}`}
              {many && collectionTitle && <>&nbsp;&nbsp;&middot;&nbsp;&nbsp;</>}
              {collectionTitle}
            </span>
            <div className="flex shrink-0 items-center gap-2.5 sm:gap-3">
              {hasDetails && !bare && (
                <button
                  type="button"
                  onClick={toggleDetails}
                  aria-label="Photo details"
                  aria-pressed={showDetails}
                  title={showDetails ? "Hide details (I)" : "Show details (I)"}
                  className={`${ROUND_BUTTON} h-10 w-10 sm:h-12 sm:w-12 ${showDetails ? "" : "opacity-60"}`}
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" aria-hidden="true">
                    <path d="M8 7v5.5" />
                    <circle cx="8" cy="4" r="0.4" fill="currentColor" />
                  </svg>
                </button>
              )}
              <button
                ref={closeButtonRef}
                type="button"
                onClick={closeLightbox}
                aria-label="Close"
                className={`${ROUND_BUTTON} h-10 w-10 sm:h-12 sm:w-12`}
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" aria-hidden="true">
                  <path d="M1 1l14 14M15 1L1 15" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* Photograph + caption. The track may not grow past the screen, or a wide photo would push off its right edge. */}
        <div
          ref={stageRef}
          className="grid min-h-0 min-w-0 flex-1 grid-cols-[minmax(0,1fr)] grid-rows-[minmax(0,1fr)] overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {outgoingIndex !== null && renderSlot(outgoingIndex, true)}
          {renderSlot(displayIndex, false)}
        </div>

        {many && !bare && (
          <>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); goPrev(); }}
              aria-label="Previous photograph"
              className={`${ROUND_BUTTON} absolute left-[44px] top-1/2 z-10 hidden h-14 w-14 -translate-y-1/2 sm:flex`}
            >
              <svg width="22" height="11" viewBox="0 0 22 11" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M22 5.5H2M9 1L2 5.5 9 10" />
              </svg>
            </button>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); goNext(); }}
              aria-label="Next photograph"
              className={`${ROUND_BUTTON} absolute right-[44px] top-1/2 z-10 hidden h-14 w-14 -translate-y-1/2 sm:flex`}
            >
              <svg width="22" height="11" viewBox="0 0 22 11" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M0 5.5h20M13 1l7 4.5-7 4.5" />
              </svg>
            </button>
          </>
        )}

        {/* Only where there is a keyboard to speak of */}
        {!bare && <p
          className="m-0 hidden shrink-0 px-10 pb-6 text-center text-[11px] uppercase tracking-[0.12em] [@media(hover:hover)_and_(pointer:fine)]:block"
          style={{ ...BODY_FONT, color: "var(--lb-hint)" }}
        >
          Esc closes{many && <> &middot; arrow keys move within the collection</>}
        </p>}
      </div>
    </>
  );
}
