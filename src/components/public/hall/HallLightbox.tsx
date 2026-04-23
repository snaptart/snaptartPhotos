"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Maximize2, PanelRightClose, PanelRightOpen, X } from "lucide-react";
import { fontRole } from "@/lib/theme/role-style";
import type { RoomPhoto } from "./RoomView";

type LightboxMode = "normal" | "focused" | "immersive";
const MODE_STORAGE_KEY = "snaptart-lightbox-mode";

export default function HallLightbox({
  galleryTitle,
  accentColor,
  photos,
  index,
  onClose,
  onIndexChange,
}: {
  galleryTitle: string;
  accentColor?: string | null;
  photos: RoomPhoto[];
  index: number;
  onClose: () => void;
  onIndexChange: (i: number) => void;
}) {
  const [shown, setShown] = useState(false);
  const dirRef = useRef(0);

  const FADE_MS = 300;
  const [displayIndex, setDisplayIndex] = useState(index);
  const [outgoingIndex, setOutgoingIndex] = useState<number | null>(null);
  const [crossfading, setCrossfading] = useState(false);
  const navTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
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
  const frameVisible = mode !== "immersive";

  // Remember the last non-immersive mode so exiting fullscreen restores
  // the user's drawer preference (normal vs focused) instead of defaulting.
  const lastNonImmersiveModeRef = useRef<LightboxMode>(
    mode === "immersive" ? "normal" : mode,
  );

  // Persist drawer preference only (not immersive, which is transient)
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
      const next = (displayIndex + delta + photos.length) % photos.length;
      dirRef.current = delta;
      onIndexChange(next);
    },
    [displayIndex, photos.length, onIndexChange],
  );

  // Sync parent-driven index change into a crossfade
  useLayoutEffect(() => {
    if (index === displayIndex) return;
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
  }, [index, displayIndex]);

  // Preload adjacent images so the next crossfade has no network hitch
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
    };
  }, []);

  const handleClose = useCallback(() => {
    setShown(false);
    setTimeout(onClose, 300);
  }, [onClose]);

  const stepBack = useCallback(() => {
    setMode((m) => {
      if (m === "immersive") return lastNonImmersiveModeRef.current;
      if (m === "focused") return "normal";
      // Already at "normal" — escape closes the lightbox
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
            label={drawerVisible ? "Hide info panel (I)" : "Show info panel (I)"}
          >
            {drawerVisible ? <PanelRightClose size={16} /> : <PanelRightOpen size={16} />}
          </ChromeButton>
          <ChromeButton onClick={toggleImmersive} label="Fullscreen (F)">
            <Maximize2 size={16} />
          </ChromeButton>
          <ChromeButton onClick={handleClose} label="Close (Esc)">
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
          <NavArrow dir="prev" disabled={false} onClick={() => go(-1)} />

          <div
            style={{
              position: "relative",
              width:
                mode === "normal"
                  ? "calc(100vw - 564px)"
                  : mode === "focused"
                    ? "calc(100vw - 204px)"
                    : "100vw",
              height: mode === "immersive" ? "100vh" : "calc(100vh - 276px)",
            }}
          >
            <div
              key={`in-${displayIndex}`}
              style={{
                position: "absolute",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                padding: frameVisible ? 16 : 0,
                background: frameVisible ? "#fff" : "transparent",
                boxShadow: frameVisible
                  ? "0 30px 80px rgba(0,0,0,0.5), 0 10px 24px rgba(0,0,0,0.3)"
                  : "none",
                display: "flex",
                opacity: incomingOpacity,
                transition:
                  outgoingIndex !== null
                    ? `opacity ${FADE_MS}ms ease`
                    : undefined,
              }}
            >
              <img
                src={photo.url}
                alt={photo.title ?? ""}
                style={{
                  display: "block",
                  maxWidth:
                    mode === "normal"
                      ? "calc(100vw - 596px)"
                      : mode === "focused"
                        ? "calc(100vw - 236px)"
                        : "100vw",
                  maxHeight: mode === "immersive" ? "100vh" : "calc(100vh - 308px)",
                  width: "auto",
                  height: "auto",
                }}
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
                  padding: frameVisible ? 16 : 0,
                  background: frameVisible ? "#fff" : "transparent",
                  boxShadow: frameVisible
                    ? "0 30px 80px rgba(0,0,0,0.5), 0 10px 24px rgba(0,0,0,0.3)"
                    : "none",
                  display: "flex",
                  opacity: crossfading ? 0 : 1,
                  transition: `opacity ${FADE_MS}ms ease`,
                  pointerEvents: "none",
                }}
              >
                <img
                  src={outgoingPhoto.url}
                  alt=""
                  style={{
                    display: "block",
                    maxWidth:
                      mode === "normal"
                        ? "calc(100vw - 596px)"
                        : mode === "focused"
                          ? "calc(100vw - 236px)"
                          : "100vw",
                    maxHeight:
                      mode === "immersive" ? "100vh" : "calc(100vh - 308px)",
                    width: "auto",
                    height: "auto",
                  }}
                />
              </div>
            )}
          </div>

          <NavArrow dir="next" disabled={false} onClick={() => go(1)} />
        </div>

        {/* drawer */}
        {drawerVisible && (
        <div
          key={`drawer-${photo.id}`}
          style={{
            background: "var(--ex-paper)",
            padding: 32,
            overflowY: "auto",
            transform: shown ? "translateX(0)" : "translateX(20px)",
            transition: "transform 400ms cubic-bezier(.2,.9,.3,1)",
            borderRadius: 2,
            boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
            display: "flex",
            flexDirection: "column",
            gap: 20,
          }}
        >
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
              {String(photos.length).padStart(2, "0")}
            </div>
            <div
              style={{
                ...fontRole("headings"),
                fontSize: 30,
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
                marginTop: 16,
              }}
            />
          </div>

          {photo.description && (
            <div
              style={{
                ...fontRole("body"),
                fontSize: 15,
                color: "var(--ex-ink-soft)",
                lineHeight: 1.5,
              }}
            >
              “{photo.description}”
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
          color: "rgba(255,255,255,0.5)",
          display: "flex",
          gap: 20,
          alignItems: "center",
          pointerEvents: "none",
        }}
      >
        <span>← / →  Navigate</span>
        <span style={{ opacity: 0.5 }}>·</span>
        <span>
          {String(index + 1).padStart(2, "0")} /{" "}
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

function ChromeButton({
  onClick,
  label,
  children,
}: {
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      title={label}
      style={{
        width: 36,
        height: 36,
        borderRadius: "50%",
        border: "1px solid rgba(255,255,255,0.35)",
        background: "rgba(255,255,255,0.08)",
        cursor: "pointer",
        color: "#fff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
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
}: {
  dir: "prev" | "next";
  disabled: boolean;
  onClick: () => void;
}) {
  const isPrev = dir === "prev";
  return (
    <button
      onClick={onClick}
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
        border: "1px solid rgba(255,255,255,0.3)",
        background: disabled ? "rgba(255,255,255,0.02)" : "rgba(255,255,255,0.08)",
        backdropFilter: "blur(8px)",
        color: disabled ? "rgba(255,255,255,0.2)" : "#fff",
        cursor: disabled ? "not-allowed" : "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 22,
        fontFamily: "serif",
        transition: "background 200ms, border-color 200ms",
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
    // takenAt is stored as UTC-of-wall-clock (filename has no TZ), so format in UTC
    // to avoid timezone drift. createdAt is a real instant, format in local time.
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
