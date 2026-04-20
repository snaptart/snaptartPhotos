"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { fontRole } from "@/lib/theme/role-style";
import type { RoomPhoto } from "./RoomView";

const NEIGHBOR_POSITIONS = [
  { top: "8%", left: "6%", size: 80, rot: -3 },
  { top: "14%", left: "82%", size: 90, rot: 4 },
  { top: "62%", left: "4%", size: 100, rot: 2 },
  { top: "72%", left: "88%", size: 80, rot: -4 },
  { top: "4%", left: "38%", size: 70, rot: 1 },
  { top: "82%", left: "42%", size: 75, rot: -2 },
  { top: "36%", left: "2%", size: 85, rot: 3 },
  { top: "48%", left: "92%", size: 85, rot: -2 },
];

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
  const photo = photos[index];

  const go = useCallback(
    (delta: number) => {
      const next = index + delta;
      if (next < 0 || next >= photos.length) return;
      dirRef.current = delta;
      onIndexChange(next);
    },
    [index, photos.length, onIndexChange],
  );

  const handleClose = useCallback(() => {
    setShown(false);
    setTimeout(onClose, 300);
  }, [onClose]);

  useEffect(() => {
    requestAnimationFrame(() => setShown(true));
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft") go(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, handleClose]);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  const neighbors = photos
    .map((p, i) => ({ p, i }))
    .filter(({ i }) => i !== index)
    .slice(0, NEIGHBOR_POSITIONS.length);

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

  return (
    <div
      className="hall-ex"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        background: shown
          ? "color-mix(in oklab, var(--ex-ink) 75%, transparent)"
          : "transparent",
        backdropFilter: shown ? "blur(16px)" : "blur(0)",
        transition: "background 320ms ease-out, backdrop-filter 320ms",
      }}
    >
      {shown &&
        neighbors.map(({ p, i: neighborOriginalIndex }, ni) => {
          const pos = NEIGHBOR_POSITIONS[ni];
          if (!pos) return null;
          return (
            <button
              key={p.id}
              onClick={() => {
                dirRef.current = neighborOriginalIndex > index ? 1 : -1;
                onIndexChange(neighborOriginalIndex);
              }}
              aria-label={`View ${p.title ?? "photo"}`}
              style={{
                position: "absolute",
                top: pos.top,
                left: pos.left,
                width: pos.size,
                height: pos.size * 0.75,
                transform: `rotate(${pos.rot}deg) scale(${shown ? 1 : 0.8})`,
                opacity: shown ? 0.5 : 0,
                transition: `opacity 500ms ${ni * 40}ms, transform 500ms ${ni * 40}ms cubic-bezier(.2,.9,.3,1.2)`,
                filter: "blur(1.5px) saturate(0.7)",
                padding: 4,
                background: "#fff",
                boxShadow: "0 8px 20px rgba(0,0,0,0.3)",
                border: "none",
                cursor: "pointer",
                overflow: "hidden",
              }}
            >
              <div style={{ position: "relative", width: "100%", height: "100%" }}>
                <Image
                  src={p.thumbnailUrl}
                  alt=""
                  fill
                  sizes="100px"
                  style={{ objectFit: "cover" }}
                />
              </div>
            </button>
          );
        })}

      <button
        onClick={handleClose}
        aria-label="Close"
        style={{
          position: "absolute",
          top: 24,
          right: 24,
          zIndex: 5,
          width: 40,
          height: 40,
          borderRadius: "50%",
          border: "1px solid rgba(255,255,255,0.35)",
          background: "rgba(255,255,255,0.08)",
          cursor: "pointer",
          color: "#fff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 18,
          fontFamily: "serif",
        }}
      >
        ×
      </button>

      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "grid",
          gridTemplateColumns: "minmax(0, 1fr) 360px",
          opacity: shown ? 1 : 0,
          transition: "opacity 400ms 100ms",
          padding: 40,
        }}
      >
        {/* photo column */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px 70px",
            position: "relative",
            transform: shown ? "scale(1)" : "scale(0.94)",
            transition: "transform 400ms cubic-bezier(.2,.9,.3,1.1)",
            minWidth: 0,
          }}
        >
          <NavArrow dir="prev" disabled={index === 0} onClick={() => go(-1)} />

          <div
            key={photo.id}
            style={{
              padding: 16,
              background: "#fff",
              boxShadow:
                "0 30px 80px rgba(0,0,0,0.5), 0 10px 24px rgba(0,0,0,0.3)",
              maxWidth: "100%",
              maxHeight: "100%",
              display: "flex",
            }}
          >
            <img
              src={photo.url}
              alt={photo.title ?? ""}
              style={{
                display: "block",
                maxWidth: "calc(100vw - 580px)",
                maxHeight: "calc(100vh - 160px)",
                width: "auto",
                height: "auto",
              }}
            />
          </div>

          <NavArrow
            dir="next"
            disabled={index === photos.length - 1}
            onClick={() => go(1)}
          />
        </div>

        {/* drawer */}
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

          {(photo.location || (photo.latitude != null && photo.longitude != null)) && (
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
                Where{photo.location ? ` · ${photo.location}` : ""}
              </div>
              {photo.latitude != null && photo.longitude != null ? (
                <EmbedMap lat={photo.latitude} lng={photo.longitude} label={photo.location ?? ""} />
              ) : (
                <StylizedMap name={photo.location ?? ""} />
              )}
              <a
                href={
                  photo.latitude != null && photo.longitude != null
                    ? `https://www.google.com/maps/search/?api=1&query=${photo.latitude},${photo.longitude}`
                    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(photo.location ?? "")}`
                }
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  marginTop: 10,
                  ...fontRole("labels"),
                  fontSize: 9,
                  letterSpacing: 1.5,
                  color: "var(--ex-ink-soft)",
                  textDecoration: "none",
                }}
              >
                Open in Google Maps ↗
              </a>
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

          {photo.createdAt && (
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
                {formatDate(photo.createdAt)}
              </div>
            </div>
          )}
        </div>
      </div>

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
        <span>Esc  Close</span>
      </div>
    </div>
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

function formatDate(iso: string) {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}
