"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { fontRole } from "@/lib/theme/role-style";
import HallLightbox from "./HallLightbox";

export const ROOM_CAPTION_FIELD_OPTIONS = [
  { key: "title", label: "Title" },
  { key: "description", label: "Description" },
  { key: "location", label: "Location" },
  { key: "year", label: "Year" },
  { key: "camera", label: "Camera settings" },
] as const;

export type RoomCaptionField = (typeof ROOM_CAPTION_FIELD_OPTIONS)[number]["key"];

export const DEFAULT_ROOM_CAPTION_FIELDS: RoomCaptionField[] = ["title", "location", "year"];

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
  tagline,
  accentColor,
  roomIndex,
  numberingLabel,
  photos,
  captionFields = DEFAULT_ROOM_CAPTION_FIELDS,
  backHref = "/",
  backLabel = "Back to map",
  returnLabel = "Return to map",
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
  backHref?: string;
  backLabel?: string;
  returnLabel?: string;
  onBack?: () => void;
}) {
  const router = useRouter();
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [entered, setEntered] = useState(false);
  const [progress, setProgress] = useState(0);
  const [viewportW, setViewportW] = useState(1200);
  const [viewportH, setViewportH] = useState(800);
  const [scrollerH, setScrollerH] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const [clientSeed, setClientSeed] = useState<string | null>(null);
  const scrollerRef = useRef<HTMLDivElement | null>(null);

  // Track viewport dims so photo frames can be clamped to never exceed the
  // available space (critical on phone screens and short landscape modes).
  useEffect(() => {
    if (typeof window === "undefined") return;
    const update = () => {
      setViewportW(window.innerWidth);
      setViewportH(window.innerHeight);
    };
    update();
    const mql = window.matchMedia("(max-width: 900px)");
    setIsMobile(mql.matches);
    const onMqlChange = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    window.addEventListener("resize", update);
    mql.addEventListener("change", onMqlChange);
    return () => {
      window.removeEventListener("resize", update);
      mql.removeEventListener("change", onMqlChange);
    };
  }, []);

  const accent = accentColor && /^#[0-9a-fA-F]{6}$/.test(accentColor) ? accentColor : "var(--ex-ink)";

  useEffect(() => {
    // Reshuffle scattered positions on each page load, then fade in so the
    // jump is invisible. Only used on desktop where photos are scattered.
    setClientSeed(Math.random().toString(36).slice(2));
    const t = setTimeout(() => setEntered(true), 40);
    return () => clearTimeout(t);
  }, []);

  // Vertical wheel → horizontal scroll; keyboard arrows
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

  // Scroll progress tracker
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const onScroll = () => {
      const max = el.scrollWidth - el.clientWidth;
      setProgress(max > 0 ? el.scrollLeft / max : 0);
    };
    el.addEventListener("scroll", onScroll);
    onScroll();
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  // Measure the scroller's actual inner height so the mobile image clamp
  // can size frames to what's truly available (the scroller lives inside a
  // flex-1 area between the site navbar and footer, so viewportH overstates
  // the space by the navbar+footer chrome).
  useLayoutEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const update = () => setScrollerH(el.clientHeight);
    update();
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const firstChar = tagline ? tagline.charAt(0) : "";
  const restChars = tagline ? tagline.slice(1) : "";

  return (
    <>
      <HallTokens />

      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "var(--ex-paper)",
          opacity: entered ? 1 : 0,
          transform: entered ? "scale(1)" : "scale(1.04)",
          transition: "opacity 480ms ease-out, transform 480ms ease-out",
          overflow: "hidden",
        }}
      >
        {!isMobile && (
          <>
            {/* ceiling band */}
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                height: 80,
                background:
                  "linear-gradient(to bottom, color-mix(in oklab, var(--ex-ink) 8%, transparent), transparent)",
                pointerEvents: "none",
                zIndex: 2,
              }}
            />
            {/* floor band */}
            <div
              style={{
                position: "absolute",
                bottom: 0,
                left: 0,
                right: 0,
                height: 110,
                background:
                  "linear-gradient(to bottom, transparent, color-mix(in oklab, var(--ex-ink) 5%, transparent) 40%, color-mix(in oklab, var(--ex-ink) 12%, transparent))",
                pointerEvents: "none",
                zIndex: 1,
              }}
            />
          </>
        )}

        {/* top bar */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            zIndex: 10,
            background: "color-mix(in oklab, var(--ex-paper) 88%, transparent)",
            backdropFilter: "blur(8px)",
            borderBottom: "1px solid var(--ex-ink-faint)",
            padding: "16px 32px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          {onBack ? (
            <button
              type="button"
              onClick={onBack}
              style={{
                ...fontRole("labels"),
                fontSize: 10,
                color: "var(--ex-ink-soft)",
                letterSpacing: 2,
                display: "flex",
                alignItems: "center",
                gap: 8,
                background: "transparent",
                border: "none",
                padding: 0,
                cursor: "pointer",
              }}
            >
              <svg width="18" height="10" aria-hidden>
                <path
                  d="M 1 5 L 16 5 M 6 1 L 1 5 L 6 9"
                  stroke="currentColor"
                  strokeWidth="1.2"
                  fill="none"
                  strokeLinecap="round"
                />
              </svg>
              {backLabel}
            </button>
          ) : (
            <Link
              href={backHref}
              style={{
                ...fontRole("labels"),
                fontSize: 10,
                color: "var(--ex-ink-soft)",
                letterSpacing: 2,
                display: "flex",
                alignItems: "center",
                gap: 8,
                textDecoration: "none",
              }}
            >
              <svg width="18" height="10" aria-hidden>
                <path
                  d="M 1 5 L 16 5 M 6 1 L 1 5 L 6 9"
                  stroke="currentColor"
                  strokeWidth="1.2"
                  fill="none"
                  strokeLinecap="round"
                />
              </svg>
              {backLabel}
            </Link>
          )}

          <div style={{ textAlign: "center" }}>
            {numberingLabel && roomIndex !== undefined && (
              <div
                style={{
                  ...fontRole("labels"),
                  fontSize: 9,
                  color: "var(--ex-ink-soft)",
                  letterSpacing: 2,
                }}
              >
                {numberingLabel} · {String(roomIndex + 1).padStart(2, "0")}
              </div>
            )}
            <div
              style={{
                ...fontRole("headings"),
                fontSize: 24,
                color: "var(--ex-ink)",
                lineHeight: 1,
              }}
            >
              {galleryTitle}
            </div>
          </div>

          <div
            style={{
              ...fontRole("labels"),
              fontSize: 10,
              color: "var(--ex-ink-soft)",
              letterSpacing: 2,
            }}
          >
            {photos.length} works
          </div>
        </div>

        {/* horizontal scroller — the long wall */}
        <div
          ref={scrollerRef}
          style={{
            position: "absolute",
            // Mobile uses a little extra top offset so the image frame +
            // its shadow don't crowd into the RoomView title bar.
            top: isMobile ? 96 : 72,
            // Mobile has no bottom chrome so the wall runs all the way to
            // the viewport edge. Desktop keeps the original scattered
            // behavior that lets frames drift into the floor band area.
            bottom: 0,
            left: 0,
            right: 0,
            overflowX: "auto",
            overflowY: "hidden",
            display: "flex",
            alignItems: "stretch",
            justifyContent: "safe center",
            scrollBehavior: "auto",
          }}
        >
          {/* wall-text placard with drop cap */}
          {tagline && (
            <div
              style={{
                flex: "0 0 auto",
                width: 520,
                padding: "80px 48px 0",
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
              }}
            >
              <div
                style={{
                  ...fontRole("labels"),
                  fontSize: 9,
                  color: "var(--ex-ink-soft)",
                  letterSpacing: 3,
                  marginBottom: 14,
                }}
              >
                — Wall text —
              </div>
              <div
                style={{
                  ...fontRole("headings"),
                  fontSize: 20,
                  color: "var(--ex-ink)",
                  lineHeight: 1.55,
                }}
              >
                <span
                  style={{
                    ...fontRole("headings"),
                    float: "left",
                    fontSize: 68,
                    lineHeight: 0.9,
                    paddingRight: 10,
                    paddingTop: 4,
                    color: accent,
                    fontStyle: "normal",
                    fontWeight: 500,
                  }}
                >
                  {firstChar}
                </span>
                <span style={{ fontStyle: "italic" }}>{restChars}</span>
              </div>
              <div style={{ width: 40, height: 1, background: "var(--ex-ink-soft)", margin: "26px 0 0" }} />
              <div
                style={{
                  ...fontRole("labels"),
                  fontSize: 9,
                  color: "var(--ex-ink-soft)",
                  letterSpacing: 2,
                  marginTop: 20,
                }}
              >
                {photos.length} works · scroll to walk the wall →
              </div>
            </div>
          )}

          {/* photos — scattered on desktop, tidy row on mobile */}
          <div
            style={{
              flex: "0 0 auto",
              display: "flex",
              alignItems: isMobile ? "flex-start" : "center",
              gap: 0,
              padding: "0 80px 0 24px",
            }}
          >
            {photos.map((p, i) => {
              const rnd = pseudoRandom(clientSeed ? `${clientSeed}-${i}` : p.id);
              const frameSidePad = 12;
              const frameTopPad = 12;
              const frameBottomPad = 72;
              const aspect = p.width && p.height ? p.width / p.height : 1.33;
              // Mobile: uniform heights, no scatter, frames fit fully within
              // the scroller (no top/bottom clipping including shadow).
              // Desktop: original scattered look with variable heights +
              // rotations + vertical offsets.
              // Clamp against the scroller's actual height (not viewport) so
              // frames never extend past the flex-1 container's bottom edge,
              // which is where the site footer begins.
              const MOBILE_BOTTOM_CLEARANCE = 50; // shadow (~30) + buffer
              const mobileMaxImgHeight = Math.max(
                120,
                (scrollerH || viewportH - 200) - frameTopPad - frameBottomPad - MOBILE_BOTTOM_CLEARANCE,
              );
              const imgHeight = isMobile
                ? Math.min(380, mobileMaxImgHeight)
                : Math.round(220 + rnd(0) * 160);
              // Width cap keeps a single frame within the viewport so it
              // can't overflow horizontally on phones.
              const maxImgWidth = Math.max(160, viewportW - 24 - frameSidePad * 2);
              const imgWidth = Math.min(imgHeight * aspect, 380, maxImgWidth);
              const parsedLoc = parseMarkdownLink(p.location);

              const offsetY = isMobile ? 0 : Math.round(-120 + rnd(1) * 240);
              const rotation = isMobile ? 0 : -12 + rnd(2) * 24;
              const marginLeft = isMobile
                ? i === 0 ? 0 : 32
                : i === 0 ? 0 : Math.round(20 + rnd(3) * 140);
              const zIndex = isMobile ? undefined : Math.floor(rnd(4) * 20);

              return (
                <button
                  key={p.id}
                  onClick={() => setLightboxIndex(i)}
                  style={{
                    background: "transparent",
                    border: "none",
                    padding: 0,
                    display: "flex",
                    cursor: "pointer",
                    transform: `translateY(${offsetY}px) rotate(${rotation}deg)`,
                    alignItems: "flex-start",
                    flex: "0 0 auto",
                    transformOrigin: "center center",
                    transition: "transform 320ms ease-out, z-index 0s",
                    marginLeft,
                    zIndex,
                  }}
                  onMouseEnter={(e) => {
                    if (isMobile) {
                      e.currentTarget.style.transform = "translateY(-8px) rotate(0deg) scale(1.03)";
                    } else {
                      e.currentTarget.style.zIndex = "50";
                      e.currentTarget.style.transform = `translateY(${offsetY - 8}px) rotate(${rotation * 0.4}deg) scale(1.04)`;
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (isMobile) {
                      e.currentTarget.style.transform = "translateY(0) rotate(0deg)";
                    } else {
                      e.currentTarget.style.zIndex = String(zIndex ?? 0);
                      e.currentTarget.style.transform = `translateY(${offsetY}px) rotate(${rotation}deg)`;
                    }
                  }}
                >
                  <div
                    style={{
                      width: imgWidth + frameSidePad * 2,
                      paddingTop: frameTopPad,
                      paddingLeft: frameSidePad,
                      paddingRight: frameSidePad,
                      paddingBottom: frameBottomPad,
                      background: "#fff",
                      boxShadow:
                        "0 14px 30px rgba(30,25,20,0.14), 0 2px 4px rgba(30,25,20,0.08)",
                      position: "relative",
                    }}
                  >
                    <div style={{ position: "relative", width: imgWidth, height: imgHeight }}>
                      <Image
                        src={p.thumbnailUrl}
                        alt={p.title ?? ""}
                        fill
                        sizes="(max-width: 768px) 60vw, 400px"
                        style={{ objectFit: "cover" }}
                      />
                    </div>
                    <div
                      style={{
                        position: "absolute",
                        left: frameSidePad,
                        right: frameSidePad,
                        top: frameTopPad + imgHeight + 14,
                        textAlign: "left",
                      }}
                    >
                      {captionFields.includes("title") && (
                        <div style={{ ...fontRole("headings"), fontSize: 13, color: "var(--ex-ink)" }}>
                          {p.title ?? "Untitled"}
                        </div>
                      )}
                      {captionFields.includes("description") && p.description && (
                        <div
                          style={{
                            ...fontRole("body"),
                            fontSize: 11,
                            color: "var(--ex-ink-soft)",
                            marginTop: captionFields.includes("title") ? 4 : 0,
                            lineHeight: 1.4,
                          }}
                        >
                          {p.description}
                        </div>
                      )}
                      {(() => {
                        const parts: React.ReactNode[] = [];
                        if (captionFields.includes("location")) {
                          if (parsedLoc) {
                            parts.push(
                              <a
                                key="location"
                                href={parsedLoc.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                style={{
                                  color: "inherit",
                                  textDecoration: "underline",
                                  textDecorationColor: "var(--ex-ink-faint)",
                                  textUnderlineOffset: 2,
                                }}
                              >
                                {parsedLoc.label}
                              </a>,
                            );
                          } else if (p.location) {
                            parts.push(<span key="location">{p.location}</span>);
                          }
                        }
                        if (captionFields.includes("year")) {
                          const year = formatYear(p.takenAt ?? p.createdAt);
                          if (year) parts.push(<span key="year">{year}</span>);
                        }
                        if (captionFields.includes("camera")) {
                          const cam = formatCamera(p.cameraSettings);
                          if (cam) parts.push(<span key="camera">{cam}</span>);
                        }
                        if (parts.length === 0) return null;
                        return (
                          <div
                            style={{
                              ...fontRole("labels"),
                              fontSize: 8,
                              color: "var(--ex-ink-soft)",
                              letterSpacing: 1,
                              marginTop: 4,
                            }}
                          >
                            {parts.map((node, idx) => (
                              <span key={idx}>
                                {idx > 0 && <span> · </span>}
                                {node}
                              </span>
                            ))}
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                </button>
              );
            })}

            {/* end placard */}
            <div
              style={{
                flex: "0 0 auto",
                width: 320,
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-start",
                justifyContent: "center",
                padding: "0 20px",
              }}
            >
              <div
                style={{
                  ...fontRole("headings"),
                  fontStyle: "italic",
                  fontSize: 16,
                  color: "var(--ex-ink-soft)",
                  marginBottom: 14,
                }}
              >
                — end of wall —
              </div>
              {onBack ? (
                <button
                  type="button"
                  onClick={onBack}
                  style={{
                    display: "inline-block",
                    background: "transparent",
                    border: "1px solid var(--ex-ink)",
                    padding: "10px 24px",
                    ...fontRole("labels"),
                    fontSize: 10,
                    letterSpacing: 2,
                    color: "var(--ex-ink)",
                    cursor: "pointer",
                  }}
                >
                  {returnLabel}
                </button>
              ) : (
                <Link
                  href={backHref}
                  style={{
                    display: "inline-block",
                    background: "transparent",
                    border: "1px solid var(--ex-ink)",
                    padding: "10px 24px",
                    ...fontRole("labels"),
                    fontSize: 10,
                    letterSpacing: 2,
                    color: "var(--ex-ink)",
                    textDecoration: "none",
                  }}
                >
                  {returnLabel}
                </Link>
              )}
            </div>
          </div>
        </div>

        {!isMobile && (
          <>
            {/* scroll progress indicator */}
            <div
              style={{
                position: "absolute",
                bottom: 46,
                left: 32,
                right: 32,
                height: 2,
                background: "var(--ex-ink-faint)",
                zIndex: 3,
                pointerEvents: "none",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  top: -3,
                  left: `${progress * 100}%`,
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: accent,
                  transform: "translateX(-50%)",
                  transition: "left 80ms linear",
                }}
              />
            </div>
            <div
              style={{
                position: "absolute",
                bottom: 18,
                left: 32,
                ...fontRole("labels"),
                fontSize: 9,
                color: "var(--ex-ink-soft)",
                letterSpacing: 2,
                zIndex: 3,
                pointerEvents: "none",
              }}
            >
              scroll / ← → / shift+wheel · esc to exit
            </div>
          </>
        )}
      </div>

      {lightboxIndex !== null && (
        <HallLightbox
          galleryTitle={galleryTitle}
          accentColor={accentColor}
          photos={photos}
          index={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onIndexChange={setLightboxIndex}
        />
      )}
    </>
  );
}

function formatYear(iso: string) {
  try {
    const d = new Date(iso);
    // takenAt is stored as UTC-of-wall-clock; createdAt is a true instant. UTC year works for both.
    return d.getUTCFullYear().toString();
  } catch {
    return "";
  }
}

function formatCamera(cs: RoomPhoto["cameraSettings"]): string {
  if (!cs) return "";
  const parts: string[] = [];
  if (cs.camera) parts.push(cs.camera);
  if (cs.lens) parts.push(cs.lens);
  if (cs.iso != null && cs.iso !== "") parts.push(`ISO ${cs.iso}`);
  if (cs.aperture) parts.push(cs.aperture);
  if (cs.shutter) parts.push(cs.shutter);
  return parts.join(" · ");
}

function parseMarkdownLink(s: string | null): { label: string; url: string } | null {
  if (!s) return null;
  const m = s.match(/^\s*\[([^\]]+)\]\(([^)]+)\)\s*$/);
  if (!m) return null;
  return { label: m[1], url: m[2] };
}

// Deterministic 0..1 sequence keyed by a photo id, used so the scattered
// desktop layout stays stable across renders while still looking random.
function pseudoRandom(seed: string) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  let state = h >>> 0;
  return (salt: number) => {
    state ^= salt + 0x9e3779b9 + (state << 6) + (state >>> 2);
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
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
