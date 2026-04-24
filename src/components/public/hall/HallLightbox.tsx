"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Info, Maximize2, PanelRightClose, PanelRightOpen, X } from "lucide-react";
import { fontRole } from "@/lib/theme/role-style";
import type { RoomPhoto } from "./RoomView";
import Slide, { deriveFrameNumber } from "../Slide";

type HallLightboxProps = {
  galleryTitle: string;
  accentColor?: string | null;
  photos: RoomPhoto[];
  index: number;
  onClose: () => void;
  onIndexChange: (i: number) => void;
  filmStamp?: string | null;
  handwritingFont?: string | null;
  stampFont?: string | null;
};

// Dispatcher — picks the desktop or mobile implementation based on viewport.
// The two variants differ enough (3-mode vs immersive-only, crossfade vs
// drag-to-slide, side drawer vs bottom sheet) that keeping them as separate
// components is cleaner than interleaving conditionals.
export default function HallLightbox(props: HallLightboxProps) {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mql = window.matchMedia("(max-width: 900px)");
    setIsMobile(mql.matches);
    const onChange = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);
  return isMobile ? <HallLightboxMobile {...props} /> : <HallLightboxDesktop {...props} />;
}

// ====================================================================
// Desktop — 3 modes (normal/focused/immersive), side drawer, crossfade,
// nav arrows, keyboard hints footer. Original behavior pre-simplification.
// ====================================================================

type LightboxMode = "normal" | "focused" | "immersive";
const MODE_STORAGE_KEY = "snaptart-lightbox-mode";

function HallLightboxDesktop({
  galleryTitle,
  accentColor,
  photos,
  index,
  onClose,
  onIndexChange,
  filmStamp,
  handwritingFont,
  stampFont,
}: HallLightboxProps) {
  const [shown, setShown] = useState(false);
  const dirRef = useRef(0);

  const FADE_MS = 300;
  const [displayIndex, setDisplayIndex] = useState(index);
  const [outgoingIndex, setOutgoingIndex] = useState<number | null>(null);
  const [crossfading, setCrossfading] = useState(false);
  const navTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [immersiveNavsVisible, setImmersiveNavsVisible] = useState(false);
  const navHideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [immersiveDragOffset, setImmersiveDragOffset] = useState(0);
  const [immersiveAnimating, setImmersiveAnimating] = useState(false);
  const [viewportW, setViewportW] = useState(1200);
  const dragStartRef = useRef<{ x: number; y: number; t: number; offset: number } | null>(null);
  const commitRef = useRef<{ direction: number } | null>(null);
  const photo = photos[displayIndex];
  const outgoingPhoto = outgoingIndex !== null ? photos[outgoingIndex] : null;
  const incomingOpacity = outgoingIndex === null || crossfading ? 1 : 0;

  const [mode, setMode] = useState<LightboxMode>(() => {
    if (typeof window === "undefined") return "normal";
    try {
      const saved = sessionStorage.getItem(MODE_STORAGE_KEY);
      if (saved === "focused") return "focused";
    } catch {}
    return "normal";
  });
  const drawerVisible = mode === "normal";
  const chromeVisible = mode !== "immersive";

  const lastNonImmersiveModeRef = useRef<LightboxMode>(
    mode === "immersive" ? "normal" : mode,
  );

  useEffect(() => {
    if (mode === "immersive") return;
    lastNonImmersiveModeRef.current = mode;
    try {
      sessionStorage.setItem(MODE_STORAGE_KEY, mode);
    } catch {}
  }, [mode]);

  const toggleDrawer = useCallback(() => {
    setMode((m) => (m === "normal" ? "focused" : "normal"));
  }, []);
  const toggleImmersive = useCallback(() => {
    setMode((m) =>
      m === "immersive" ? lastNonImmersiveModeRef.current : "immersive",
    );
  }, []);

  const go = useCallback(
    (delta: number) => {
      if (photos.length === 0) return;
      if (mode === "immersive") {
        if (photos.length <= 1 || immersiveAnimating) return;
        commitRef.current = { direction: delta };
        setImmersiveAnimating(true);
        setImmersiveDragOffset(-delta * viewportW);
        return;
      }
      const next = (displayIndex + delta + photos.length) % photos.length;
      dirRef.current = delta;
      onIndexChange(next);
    },
    [mode, immersiveAnimating, viewportW, displayIndex, photos.length, onIndexChange],
  );

  useLayoutEffect(() => {
    if (index === displayIndex) return;
    if (mode === "immersive") {
      if (navTimerRef.current) {
        clearTimeout(navTimerRef.current);
        navTimerRef.current = null;
      }
      setDisplayIndex(index);
      setOutgoingIndex(null);
      setCrossfading(false);
      return;
    }
    if (navTimerRef.current) clearTimeout(navTimerRef.current);
    setOutgoingIndex(displayIndex);
    setDisplayIndex(index);
    setCrossfading(false);
    requestAnimationFrame(() =>
      requestAnimationFrame(() => setCrossfading(true)),
    );
    navTimerRef.current = setTimeout(() => {
      setOutgoingIndex(null);
      setCrossfading(false);
    }, FADE_MS + 60);
  }, [index, displayIndex, mode]);

  useEffect(() => {
    if (photos.length <= 1) return;
    const nextIdx = (displayIndex + 1) % photos.length;
    const prevIdx = (displayIndex - 1 + photos.length) % photos.length;
    [nextIdx, prevIdx].forEach((i) => {
      const img = new window.Image();
      img.src = photos[i].url;
    });
  }, [displayIndex, photos]);

  useEffect(() => {
    return () => {
      if (navTimerRef.current) clearTimeout(navTimerRef.current);
      if (navHideTimerRef.current) clearTimeout(navHideTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (mode !== "immersive") {
      setImmersiveNavsVisible(false);
      if (navHideTimerRef.current) {
        clearTimeout(navHideTimerRef.current);
        navHideTimerRef.current = null;
      }
      setImmersiveDragOffset(0);
      setImmersiveAnimating(false);
      commitRef.current = null;
      dragStartRef.current = null;
    }
  }, [mode]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const update = () => setViewportW(window.innerWidth);
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  const onImmersivePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (mode !== "immersive") return;
      if ((e.target as HTMLElement).closest("button, a")) return;
      commitRef.current = null;
      dragStartRef.current = {
        x: e.clientX,
        y: e.clientY,
        t: Date.now(),
        offset: immersiveDragOffset,
      };
      setImmersiveAnimating(false);
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    },
    [mode, immersiveDragOffset],
  );

  const onImmersivePointerMove = useCallback((e: React.PointerEvent) => {
    const start = dragStartRef.current;
    if (!start) return;
    const dx = e.clientX - start.x;
    setImmersiveDragOffset(start.offset + dx);
  }, []);

  const onImmersivePointerUp = useCallback(
    (e: React.PointerEvent) => {
      const start = dragStartRef.current;
      dragStartRef.current = null;
      if ((e.currentTarget as HTMLElement).hasPointerCapture(e.pointerId)) {
        (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
      }
      if (!start) return;
      const dx = e.clientX - start.x;
      const dy = e.clientY - start.y;
      const absX = Math.abs(dx);
      const absY = Math.abs(dy);
      const dt = Date.now() - start.t;
      const TAP_MAX_MOVE = 8;
      const TAP_MAX_MS = 250;
      const threshold = Math.max(60, viewportW * 0.15);

      if (absX < TAP_MAX_MOVE && absY < TAP_MAX_MOVE && dt < TAP_MAX_MS) {
        setImmersiveAnimating(false);
        setImmersiveDragOffset(0);
        return;
      }

      if (absX > threshold && absX > absY && photos.length > 1) {
        const direction = dx < 0 ? 1 : -1;
        commitRef.current = { direction };
        setImmersiveAnimating(true);
        setImmersiveDragOffset(-direction * viewportW);
      } else {
        setImmersiveAnimating(true);
        setImmersiveDragOffset(0);
      }
    },
    [viewportW, photos.length],
  );

  const onImmersiveSlideEnd = useCallback(() => {
    const commit = commitRef.current;
    commitRef.current = null;
    if (commit) {
      const newIndex = (displayIndex + commit.direction + photos.length) % photos.length;
      setDisplayIndex(newIndex);
      setImmersiveAnimating(false);
      setImmersiveDragOffset(0);
      onIndexChange(newIndex);
    } else {
      setImmersiveAnimating(false);
    }
  }, [displayIndex, photos.length, onIndexChange]);

  const handleNavMouseEnter = useCallback(() => {
    if (mode !== "immersive") return;
    if (navHideTimerRef.current) {
      clearTimeout(navHideTimerRef.current);
      navHideTimerRef.current = null;
    }
    setImmersiveNavsVisible(true);
  }, [mode]);

  const handleNavMouseLeave = useCallback(() => {
    if (mode !== "immersive") return;
    if (navHideTimerRef.current) clearTimeout(navHideTimerRef.current);
    navHideTimerRef.current = setTimeout(() => {
      setImmersiveNavsVisible(false);
      navHideTimerRef.current = null;
    }, 2000);
  }, [mode]);

  const navsVisible = mode !== "immersive" || immersiveNavsVisible;

  const handleClose = useCallback(() => {
    setShown(false);
    setTimeout(onClose, 300);
  }, [onClose]);

  const stepBack = useCallback(() => {
    setMode((m) => {
      if (m === "immersive") return lastNonImmersiveModeRef.current;
      if (m === "focused") return "normal";
      handleClose();
      return m;
    });
  }, [handleClose]);

  useEffect(() => {
    requestAnimationFrame(() => setShown(true));
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") stepBack();
      else if (e.key === "ArrowRight") go(1);
      else if (e.key === "ArrowLeft") go(-1);
      else if (e.key === "i" || e.key === "I") toggleDrawer();
      else if (e.key === "f" || e.key === "F") toggleImmersive();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, stepBack, toggleDrawer, toggleImmersive]);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  const locationLink = parseMarkdownLink(photo.location);
  const locationHref =
    locationLink.href ??
    (photo.latitude != null && photo.longitude != null
      ? `https://www.google.com/maps/search/?api=1&query=${photo.latitude},${photo.longitude}`
      : locationLink.label
        ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(locationLink.label)}`
        : null);

  const camera = photo.cameraSettings ?? null;
  const cameraLine = camera
    ? [camera.camera, camera.lens].filter(Boolean).join(" · ")
    : "";
  const settingsLine = camera
    ? [
        camera.iso ? `ISO ${camera.iso}` : null,
        camera.aperture ? `ƒ/${String(camera.aperture).replace(/^f\//i, "")}` : null,
        camera.shutter ?? null,
      ]
        .filter(Boolean)
        .join(" · ")
    : "";

  const onLightBg = mode !== "immersive";
  const backdropColor = onLightBg ? "#ffffff" : "#000";

  const content = (
    <div
      className="hall-ex"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        background: shown ? backdropColor : "transparent",
        backdropFilter: shown ? (onLightBg ? "blur(4px)" : "blur(16px)") : "blur(0)",
        transition: "background 320ms ease-out, backdrop-filter 320ms",
      }}
    >
      {!chromeVisible && (
        <button
          onClick={stepBack}
          aria-label="Exit fullscreen (Esc)"
          title="Exit fullscreen (Esc)"
          style={{
            position: "absolute",
            top: 16,
            right: 16,
            zIndex: 5,
            width: 28,
            height: 28,
            borderRadius: "50%",
            border: "1px solid rgba(255,255,255,0.2)",
            background: "rgba(255,255,255,0.05)",
            color: "rgba(255,255,255,0.6)",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <X size={14} />
        </button>
      )}
      {chromeVisible && (
        <div
          style={{
            position: "absolute",
            top: 24,
            right: 24,
            zIndex: 5,
            display: "flex",
            gap: 8,
          }}
        >
          <ChromeButton
            onClick={toggleDrawer}
            variant="light"
            label={drawerVisible ? "Hide info panel (I)" : "Show info panel (I)"}
          >
            {drawerVisible ? <PanelRightClose size={16} /> : <PanelRightOpen size={16} />}
          </ChromeButton>
          <ChromeButton onClick={toggleImmersive} variant="light" label="Fullscreen (F)">
            <Maximize2 size={16} />
          </ChromeButton>
          <ChromeButton onClick={handleClose} variant="light" label="Close (Esc)">
            <X size={16} />
          </ChromeButton>
        </div>
      )}

      <div
        style={{
          position: "absolute",
          top: mode === "immersive" ? 0 : 72,
          bottom: mode === "immersive" ? 0 : 100,
          left: 0,
          right: 0,
          display: "grid",
          gridTemplateColumns: drawerVisible
            ? "minmax(0, 1fr) 360px"
            : "minmax(0, 1fr)",
          gridTemplateRows: "minmax(0, 1fr)",
          opacity: shown ? 1 : 0,
          transition: "opacity 400ms 100ms",
          padding: mode === "immersive" ? 0 : 32,
          minHeight: 0,
        }}
      >
        {/* photo column */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: mode === "immersive" ? 0 : "20px 70px",
            position: "relative",
            transform: shown ? "scale(1)" : "scale(0.94)",
            transition: "transform 400ms cubic-bezier(.2,.9,.3,1.1)",
            minWidth: 0,
          }}
        >
          <NavArrow
            dir="prev"
            disabled={false}
            onClick={() => go(-1)}
            visible={navsVisible}
            variant={onLightBg ? "light" : "dark"}
            onMouseEnter={handleNavMouseEnter}
            onMouseLeave={handleNavMouseLeave}
          />

          {mode === "immersive" ? (
            <div
              onPointerDown={onImmersivePointerDown}
              onPointerMove={onImmersivePointerMove}
              onPointerUp={onImmersivePointerUp}
              onPointerCancel={onImmersivePointerUp}
              style={{
                position: "absolute",
                inset: 0,
                overflow: "hidden",
                touchAction: "none",
                userSelect: "none",
              }}
            >
              {[-1, 0, 1]
                .map((rel) => ({
                  rel,
                  i: (displayIndex + rel + photos.length) % photos.length,
                }))
                .filter(
                  (s, idx, arr) => arr.findIndex((x) => x.i === s.i) === idx,
                )
                .map(({ rel, i }) => {
                  const p = photos[i];
                  return (
                    <div
                      key={`slot-${rel}`}
                      onTransitionEnd={
                        rel === 0 ? onImmersiveSlideEnd : undefined
                      }
                      style={{
                        position: "absolute",
                        inset: 0,
                        transform: `translateX(calc(${rel * 100}vw + ${immersiveDragOffset}px))`,
                        transition: immersiveAnimating
                          ? "transform 320ms cubic-bezier(.2,.9,.3,1)"
                          : "none",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        willChange: "transform",
                      }}
                    >
                      <img
                        src={p.url}
                        alt={p.title ?? ""}
                        draggable={false}
                        style={{
                          display: "block",
                          maxWidth: "100vw",
                          maxHeight: "100vh",
                          width: "auto",
                          height: "auto",
                          userSelect: "none",
                          pointerEvents: "none",
                        }}
                      />
                    </div>
                  );
                })}
            </div>
          ) : (
            <div
              style={{
                position: "relative",
                width:
                  mode === "normal"
                    ? "calc(100vw - 564px)"
                    : "calc(100vw - 204px)",
                height: "calc(100vh - 276px)",
              }}
            >
              <div
                key={`in-${displayIndex}`}
                style={{
                  position: "absolute",
                  top: "50%",
                  left: "50%",
                  transform: "translate(-50%, -50%)",
                  width:
                    mode === "normal"
                      ? "min(calc(100vw - 596px), calc(100vh - 308px))"
                      : "min(calc(100vw - 236px), calc(100vh - 308px))",
                  aspectRatio: "1 / 1",
                  opacity: incomingOpacity,
                  transition:
                    outgoingIndex !== null
                      ? `opacity ${FADE_MS}ms ease`
                      : undefined,
                }}
              >
                <Slide
                  photo={{
                    id: photo.id,
                    url: photo.url,
                    thumbnailUrl: photo.thumbnailUrl,
                    title: photo.title,
                    width: photo.width,
                    height: photo.height,
                    takenAt: photo.takenAt ?? photo.createdAt,
                  }}
                  tilt={0}
                  frameNumber={deriveFrameNumber(displayIndex)}
                  filmStamp={filmStamp}
                  handwritingFont={handwritingFont}
                  stampFont={stampFont}
                  useThumbnail={false}
                  sizes="80vh"
                />
              </div>
              {outgoingPhoto && (
                <div
                  key={`out-${outgoingIndex}`}
                  aria-hidden
                  style={{
                    position: "absolute",
                    top: "50%",
                    left: "50%",
                    transform: "translate(-50%, -50%)",
                    width:
                      mode === "normal"
                        ? "min(calc(100vw - 596px), calc(100vh - 308px))"
                        : "min(calc(100vw - 236px), calc(100vh - 308px))",
                    aspectRatio: "1 / 1",
                    opacity: crossfading ? 0 : 1,
                    transition: `opacity ${FADE_MS}ms ease`,
                    pointerEvents: "none",
                  }}
                >
                  <Slide
                    photo={{
                      id: outgoingPhoto.id,
                      url: outgoingPhoto.url,
                      thumbnailUrl: outgoingPhoto.thumbnailUrl,
                      title: outgoingPhoto.title,
                      width: outgoingPhoto.width,
                      height: outgoingPhoto.height,
                      takenAt: outgoingPhoto.takenAt ?? outgoingPhoto.createdAt,
                    }}
                    tilt={0}
                    frameNumber={deriveFrameNumber(outgoingIndex!)}
                    filmStamp={filmStamp}
                    handwritingFont={handwritingFont}
                    stampFont={stampFont}
                    useThumbnail={false}
                    sizes="80vh"
                  />
                </div>
              )}
            </div>
          )}

          <NavArrow
            dir="next"
            disabled={false}
            onClick={() => go(1)}
            visible={navsVisible}
            variant={onLightBg ? "light" : "dark"}
            onMouseEnter={handleNavMouseEnter}
            onMouseLeave={handleNavMouseLeave}
          />
        </div>

        {/* drawer */}
        {drawerVisible && (
          <div
            key={`drawer-${photo.id}`}
            style={{
              background: "#ffffff",
              padding: 32,
              overflowY: "auto",
              transform: shown ? "translateX(0)" : "translateX(20px)",
              transition: "transform 400ms cubic-bezier(.2,.9,.3,1)",
              borderRadius: 2,
              border: "1px solid rgba(0,0,0,0.08)",
              boxShadow: "0 14px 40px rgba(60,50,35,0.10), 0 2px 6px rgba(60,50,35,0.05)",
              display: "flex",
              flexDirection: "column",
              gap: 20,
            }}
          >
            <DrawerContent
              galleryTitle={galleryTitle}
              accentColor={accentColor ?? null}
              photo={photo}
              index={displayIndex}
              total={photos.length}
              locationLink={locationLink}
              locationHref={locationHref}
              cameraLine={cameraLine}
              settingsLine={settingsLine}
            />
          </div>
        )}
      </div>

      {chromeVisible && (
        <div
          style={{
            position: "absolute",
            bottom: 20,
            left: "50%",
            transform: "translateX(-50%)",
            ...fontRole("labels"),
            fontSize: 9,
            letterSpacing: 2,
            color: onLightBg ? "rgba(0,0,0,0.45)" : "rgba(255,255,255,0.5)",
            display: "flex",
            gap: 20,
            alignItems: "center",
            pointerEvents: "none",
          }}
        >
          <span>← / →  Navigate</span>
          <span style={{ opacity: 0.5 }}>·</span>
          <span>
            {String(displayIndex + 1).padStart(2, "0")} /{" "}
            {String(photos.length).padStart(2, "0")}
          </span>
          <span style={{ opacity: 0.5 }}>·</span>
          <span>I  Info</span>
          <span style={{ opacity: 0.5 }}>·</span>
          <span>F  Fullscreen</span>
          <span style={{ opacity: 0.5 }}>·</span>
          <span>Esc  Back</span>
        </div>
      )}
    </div>
  );

  if (mode === "immersive" && typeof document !== "undefined") {
    return createPortal(content, document.body);
  }
  return content;
}

// ====================================================================
// Mobile — immersive-only, bottom sheet drawer, drag-to-slide carousel.
// ====================================================================

const DRAWER_STORAGE_KEY = "snaptart-lightbox-drawer";

function HallLightboxMobile({
  galleryTitle,
  accentColor,
  photos,
  index,
  onClose,
  onIndexChange,
}: HallLightboxProps) {
  const [shown, setShown] = useState(false);
  const [showDrawer, setShowDrawer] = useState(() => {
    if (typeof window === "undefined") return false;
    try {
      return sessionStorage.getItem(DRAWER_STORAGE_KEY) === "1";
    } catch {
      return false;
    }
  });
  const [dragOffset, setDragOffset] = useState(0);
  const [animating, setAnimating] = useState(false);
  const [viewportW, setViewportW] = useState(1200);
  const dragStartRef = useRef<{ x: number; y: number; t: number; offset: number } | null>(null);
  const commitRef = useRef<{ direction: number } | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const update = () => setViewportW(window.innerWidth);
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  useEffect(() => {
    try {
      sessionStorage.setItem(DRAWER_STORAGE_KEY, showDrawer ? "1" : "0");
    } catch {}
  }, [showDrawer]);

  const toggleDrawer = useCallback(() => setShowDrawer((v) => !v), []);

  const handleClose = useCallback(() => {
    setShown(false);
    setTimeout(onClose, 300);
  }, [onClose]);

  const go = useCallback(
    (delta: number) => {
      if (photos.length <= 1) return;
      commitRef.current = { direction: delta };
      setAnimating(true);
      setDragOffset(-delta * viewportW);
    },
    [photos.length, viewportW],
  );

  useEffect(() => {
    if (photos.length <= 1) return;
    const nextIdx = (index + 1) % photos.length;
    const prevIdx = (index - 1 + photos.length) % photos.length;
    [nextIdx, prevIdx].forEach((i) => {
      const img = new window.Image();
      img.src = photos[i].url;
    });
  }, [index, photos]);

  useEffect(() => {
    requestAnimationFrame(() => setShown(true));
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
      else if (e.key === "ArrowRight") go(1);
      else if (e.key === "ArrowLeft") go(-1);
      else if (e.key === "i" || e.key === "I") toggleDrawer();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, handleClose, toggleDrawer]);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if ((e.target as HTMLElement).closest("button, a")) return;
      commitRef.current = null;
      dragStartRef.current = {
        x: e.clientX,
        y: e.clientY,
        t: Date.now(),
        offset: dragOffset,
      };
      setAnimating(false);
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    },
    [dragOffset],
  );

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    const start = dragStartRef.current;
    if (!start) return;
    const dx = e.clientX - start.x;
    setDragOffset(start.offset + dx);
  }, []);

  const onPointerUp = useCallback(
    (e: React.PointerEvent) => {
      const start = dragStartRef.current;
      dragStartRef.current = null;
      if ((e.currentTarget as HTMLElement).hasPointerCapture(e.pointerId)) {
        (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
      }
      if (!start) return;
      const dx = e.clientX - start.x;
      const dy = e.clientY - start.y;
      const absX = Math.abs(dx);
      const absY = Math.abs(dy);
      const dt = Date.now() - start.t;
      const TAP_MAX_MOVE = 8;
      const TAP_MAX_MS = 250;
      const threshold = Math.max(50, viewportW * 0.2);

      if (absX < TAP_MAX_MOVE && absY < TAP_MAX_MOVE && dt < TAP_MAX_MS) {
        if (showDrawer) setShowDrawer(false);
        setAnimating(false);
        setDragOffset(0);
        return;
      }

      if (absX > threshold && absX > absY && photos.length > 1) {
        const direction = dx < 0 ? 1 : -1;
        commitRef.current = { direction };
        setAnimating(true);
        setDragOffset(-direction * viewportW);
      } else {
        setAnimating(true);
        setDragOffset(0);
      }
    },
    [viewportW, showDrawer, photos.length],
  );

  const onSlideTransitionEnd = useCallback(() => {
    const commit = commitRef.current;
    commitRef.current = null;
    if (commit) {
      const newIndex = (index + commit.direction + photos.length) % photos.length;
      setAnimating(false);
      setDragOffset(0);
      onIndexChange(newIndex);
    } else {
      setAnimating(false);
    }
  }, [index, photos.length, onIndexChange]);

  const photo = photos[index];
  const locationLink = parseMarkdownLink(photo.location);
  const locationHref =
    locationLink.href ??
    (photo.latitude != null && photo.longitude != null
      ? `https://www.google.com/maps/search/?api=1&query=${photo.latitude},${photo.longitude}`
      : locationLink.label
        ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(locationLink.label)}`
        : null);

  const camera = photo.cameraSettings ?? null;
  const cameraLine = camera
    ? [camera.camera, camera.lens].filter(Boolean).join(" · ")
    : "";
  const settingsLine = camera
    ? [
        camera.iso ? `ISO ${camera.iso}` : null,
        camera.aperture ? `ƒ/${String(camera.aperture).replace(/^f\//i, "")}` : null,
        camera.shutter ?? null,
      ]
        .filter(Boolean)
        .join(" · ")
    : "";

  const slotIndices = [-1, 0, 1]
    .map((rel) => ({ rel, i: (index + rel + photos.length) % photos.length }))
    .filter((s, idx, arr) => arr.findIndex((x) => x.i === s.i) === idx);

  const content = (
    <div
      className="hall-ex"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        background: shown ? "#000" : "transparent",
        backdropFilter: shown ? "blur(16px)" : "blur(0)",
        transition: "background 320ms ease-out, backdrop-filter 320ms",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 20,
          right: 20,
          zIndex: 30,
          display: "flex",
          gap: 8,
        }}
      >
        <ChromeButton
          onClick={toggleDrawer}
          label={showDrawer ? "Hide info panel (I)" : "Show info panel (I)"}
          active={showDrawer}
        >
          <Info size={16} />
        </ChromeButton>
        <ChromeButton onClick={handleClose} label="Close (Esc)">
          <X size={16} />
        </ChromeButton>
      </div>

      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        style={{
          position: "absolute",
          inset: 0,
          overflow: "hidden",
          opacity: shown ? 1 : 0,
          transition: "opacity 400ms 100ms",
          touchAction: "none",
          userSelect: "none",
        }}
      >
        {slotIndices.map(({ rel, i }) => {
          const p = photos[i];
          return (
            <div
              key={`slot-${rel}`}
              onTransitionEnd={rel === 0 ? onSlideTransitionEnd : undefined}
              style={{
                position: "absolute",
                inset: 0,
                transform: `translateX(calc(${rel * 100}vw + ${dragOffset}px))`,
                transition: animating
                  ? "transform 300ms cubic-bezier(.2,.9,.3,1)"
                  : "none",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                willChange: "transform",
              }}
            >
              <img
                src={p.url}
                alt={p.title ?? ""}
                draggable={false}
                style={{
                  maxWidth: "100vw",
                  maxHeight: "100vh",
                  width: "auto",
                  height: "auto",
                  display: "block",
                  userSelect: "none",
                  pointerEvents: "none",
                }}
              />
            </div>
          );
        })}
      </div>

      <div
        aria-hidden={!showDrawer}
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          maxHeight: "48vh",
          zIndex: 20,
          background: "var(--ex-paper)",
          padding: "20px 20px 32px",
          overflowY: "auto",
          borderRadius: "16px 16px 0 0",
          boxShadow:
            "0 -10px 40px rgba(0,0,0,0.4), 0 20px 60px rgba(0,0,0,0.3)",
          display: "flex",
          flexDirection: "column",
          gap: 20,
          transform: showDrawer ? "translateY(0)" : "translateY(100%)",
          transition: "transform 320ms cubic-bezier(.2,.9,.3,1)",
          pointerEvents: showDrawer ? "auto" : "none",
        }}
      >
        <DrawerContent
          galleryTitle={galleryTitle}
          accentColor={accentColor ?? null}
          photo={photo}
          index={index}
          total={photos.length}
          locationLink={locationLink}
          locationHref={locationHref}
          cameraLine={cameraLine}
          settingsLine={settingsLine}
        />
      </div>
    </div>
  );

  return typeof document !== "undefined"
    ? createPortal(content, document.body)
    : content;
}

// ====================================================================
// Shared helpers
// ====================================================================

function DrawerContent({
  galleryTitle,
  accentColor,
  photo,
  index,
  total,
  locationLink,
  locationHref,
  cameraLine,
  settingsLine,
}: {
  galleryTitle: string;
  accentColor: string | null;
  photo: RoomPhoto;
  index: number;
  total: number;
  locationLink: { label: string; href: string | null };
  locationHref: string | null;
  cameraLine: string;
  settingsLine: string;
}) {
  return (
    <>
      <div>
        <div
          style={{
            ...fontRole("labels"),
            fontSize: 9,
            letterSpacing: 2,
            color: "var(--ex-ink-soft)",
          }}
        >
          {galleryTitle} · {String(index + 1).padStart(2, "0")} /{" "}
          {String(total).padStart(2, "0")}
        </div>
        <div
          style={{
            ...fontRole("headings"),
            fontSize: 28,
            color: "var(--ex-ink)",
            marginTop: 8,
            lineHeight: 1.05,
          }}
        >
          {photo.title ?? "Untitled"}
        </div>
        <div
          style={{
            width: 32,
            height: 1,
            background: accentColor ?? "var(--ex-accent)",
            marginTop: 14,
          }}
        />
      </div>

      {photo.description && (
        <div
          style={{
            ...fontRole("body"),
            fontSize: 14,
            color: "var(--ex-ink-soft)",
            lineHeight: 1.5,
          }}
        >
          &ldquo;{photo.description}&rdquo;
        </div>
      )}

      {(locationLink.label || (photo.latitude != null && photo.longitude != null)) && (
        <div>
          <div
            style={{
              ...fontRole("labels"),
              fontSize: 9,
              letterSpacing: 2,
              color: "var(--ex-ink-soft)",
              marginBottom: 10,
            }}
          >
            Where
            {locationLink.label && (
              <>
                {" · "}
                {locationHref ? (
                  <a
                    href={locationHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      color: "var(--ex-accent)",
                      textDecoration: "underline",
                      textUnderlineOffset: 2,
                    }}
                  >
                    {locationLink.label}
                  </a>
                ) : (
                  locationLink.label
                )}
              </>
            )}
          </div>
          {photo.latitude != null && photo.longitude != null ? (
            <EmbedMap lat={photo.latitude} lng={photo.longitude} label={locationLink.label} />
          ) : (
            <StylizedMap name={locationLink.label} />
          )}
        </div>
      )}

      {cameraLine && (
        <div>
          <div
            style={{
              ...fontRole("labels"),
              fontSize: 9,
              letterSpacing: 2,
              color: "var(--ex-ink-soft)",
              marginBottom: 10,
            }}
          >
            Camera
          </div>
          <div
            style={{
              ...fontRole("labels"),
              fontSize: 11,
              color: "var(--ex-ink)",
              lineHeight: 1.8,
            }}
          >
            {cameraLine}
            {settingsLine && (
              <>
                <br />
                <span style={{ color: "var(--ex-ink-soft)" }}>{settingsLine}</span>
              </>
            )}
          </div>
        </div>
      )}

      {(photo.takenAt || photo.createdAt) && (
        <div>
          <div
            style={{
              ...fontRole("labels"),
              fontSize: 9,
              letterSpacing: 2,
              color: "var(--ex-ink-soft)",
              marginBottom: 6,
            }}
          >
            When
          </div>
          <div
            style={{
              ...fontRole("labels"),
              fontSize: 11,
              color: "var(--ex-ink)",
            }}
          >
            {formatDate(photo.takenAt ?? photo.createdAt, photo.takenAt != null)}
          </div>
        </div>
      )}
    </>
  );
}

function ChromeButton({
  onClick,
  label,
  active,
  variant = "dark",
  children,
}: {
  onClick: () => void;
  label: string;
  active?: boolean;
  variant?: "dark" | "light";
  children: React.ReactNode;
}) {
  const onLight = variant === "light";
  return (
    <button
      onClick={onClick}
      aria-label={label}
      aria-pressed={active}
      title={label}
      style={{
        width: 36,
        height: 36,
        borderRadius: "50%",
        border: onLight
          ? "1px solid rgba(0,0,0,0.15)"
          : "1px solid rgba(255,255,255,0.35)",
        background: onLight
          ? active ? "rgba(0,0,0,0.10)" : "rgba(0,0,0,0.04)"
          : active ? "rgba(255,255,255,0.25)" : "rgba(255,255,255,0.08)",
        cursor: "pointer",
        color: onLight ? "rgba(0,0,0,0.65)" : "#fff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backdropFilter: "blur(6px)",
      }}
    >
      {children}
    </button>
  );
}

function NavArrow({
  dir,
  disabled,
  onClick,
  visible = true,
  variant = "dark",
  onMouseEnter,
  onMouseLeave,
}: {
  dir: "prev" | "next";
  disabled: boolean;
  onClick: () => void;
  visible?: boolean;
  variant?: "dark" | "light";
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}) {
  const isPrev = dir === "prev";
  const onLight = variant === "light";
  return (
    <button
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      disabled={disabled}
      aria-label={isPrev ? "Previous photo" : "Next photo"}
      style={{
        position: "absolute",
        [isPrev ? "left" : "right"]: 8,
        top: "50%",
        transform: "translateY(-50%)",
        width: 56,
        height: 56,
        borderRadius: "50%",
        border: visible
          ? onLight ? "1px solid rgba(0,0,0,0.15)" : "1px solid rgba(255,255,255,0.3)"
          : "1px solid transparent",
        background: disabled
          ? onLight ? "rgba(0,0,0,0.02)" : "rgba(255,255,255,0.02)"
          : visible
            ? onLight ? "rgba(0,0,0,0.05)" : "rgba(255,255,255,0.08)"
            : "transparent",
        backdropFilter: visible ? "blur(8px)" : "none",
        color: disabled
          ? onLight ? "rgba(0,0,0,0.2)" : "rgba(255,255,255,0.2)"
          : onLight ? "rgba(0,0,0,0.65)" : "#fff",
        cursor: disabled ? "not-allowed" : "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 22,
        fontFamily: "serif",
        opacity: visible ? 1 : 0,
        transition: "background 200ms, border-color 200ms, opacity 280ms ease",
        zIndex: 3,
      }}
    >
      {isPrev ? "‹" : "›"}
    </button>
  );
}

function EmbedMap({ lat, lng, label }: { lat: number; lng: number; label: string }) {
  const src = `https://maps.google.com/maps?q=${lat},${lng}&z=12&output=embed`;
  return (
    <div
      style={{
        width: "100%",
        height: 180,
        border: "1px solid var(--ex-ink-faint)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <iframe
        src={src}
        title={`Map of ${label || `${lat}, ${lng}`}`}
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        style={{ border: 0, width: "100%", height: "100%", display: "block" }}
      />
    </div>
  );
}

function StylizedMap({ name }: { name: string }) {
  return (
    <div
      aria-label={`Stylized map of ${name}`}
      style={{
        width: "100%",
        height: 160,
        border: "1px solid var(--ex-ink)",
        position: "relative",
        overflow: "hidden",
        background:
          "radial-gradient(circle at 30% 40%, #e4ecd8 0 18%, transparent 18%), radial-gradient(circle at 72% 60%, #dce4ec 0 14%, transparent 14%), radial-gradient(circle at 55% 25%, #e8e0cc 0 10%, transparent 10%), #f0ebdd",
      }}
    >
      <svg width="100%" height="100%" style={{ position: "absolute", inset: 0 }}>
        {Array.from({ length: 10 }).map((_, i) => (
          <line
            key={`h${i}`}
            x1={0}
            y1={i * 18}
            x2="100%"
            y2={i * 18 + 8}
            stroke="rgba(0,0,0,0.08)"
            strokeWidth="0.8"
          />
        ))}
        {Array.from({ length: 14 }).map((_, i) => (
          <line
            key={`v${i}`}
            x1={i * 28}
            y1={0}
            x2={i * 28 + 5}
            y2="100%"
            stroke="rgba(0,0,0,0.08)"
            strokeWidth="0.8"
          />
        ))}
        <path d="M 0 70 Q 80 40 180 60 T 360 30" stroke="#d4c29a" strokeWidth="5" fill="none" opacity="0.8" />
        <path
          d="M 0 70 Q 80 40 180 60 T 360 30"
          stroke="#fff"
          strokeWidth="1"
          fill="none"
          strokeDasharray="4 4"
        />
        <path
          d="M 0 130 Q 120 150 220 135 T 360 160 L 360 160 L 0 160 Z"
          fill="#b8cdd6"
          opacity="0.7"
        />
      </svg>

      <div
        style={{
          position: "absolute",
          left: "50%",
          top: "50%",
          transform: "translate(-50%, -100%)",
        }}
      >
        <svg width="26" height="32" viewBox="0 0 26 32">
          <path
            d="M 13 2 C 7 2 3 6 3 12 C 3 20 13 30 13 30 C 13 30 23 20 23 12 C 23 6 19 2 13 2 Z"
            fill="var(--ex-accent)"
            stroke="var(--ex-ink)"
            strokeWidth="1.2"
          />
          <circle cx="13" cy="12" r="4" fill="var(--ex-paper)" />
        </svg>
      </div>

      <div
        style={{
          position: "absolute",
          bottom: 6,
          left: 8,
          ...fontRole("labels"),
          fontSize: 8,
          color: "var(--ex-ink)",
          background: "rgba(255,253,246,0.85)",
          padding: "2px 6px",
          letterSpacing: 1,
          maxWidth: "calc(100% - 16px)",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {name}
      </div>
    </div>
  );
}

function parseMarkdownLink(raw: string | null | undefined): {
  label: string;
  href: string | null;
} {
  const text = (raw ?? "").trim();
  const match = text.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
  if (match) return { label: match[1].trim(), href: match[2].trim() };
  return { label: text, href: null };
}

function formatDate(iso: string, isTakenAt = false) {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, {
      year: "numeric",
      month: "long",
      day: "numeric",
      ...(isTakenAt ? { timeZone: "UTC" } : {}),
    });
  } catch {
    return iso;
  }
}
