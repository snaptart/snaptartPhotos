"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { fontRole } from "@/lib/theme/role-style";
import HallLightbox from "./HallLightbox";

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
  createdAt: string;
};

export default function RoomView({
  galleryTitle,
  tagline,
  accentColor,
  roomIndex,
  numberingLabel,
  photos,
  backHref = "/",
  backLabel = "Back to map",
  returnLabel = "Return to map",
}: {
  galleryTitle: string;
  gallerySlug: string;
  tagline: string;
  accentColor: string | null;
  roomIndex?: number;
  numberingLabel?: string;
  photos: RoomPhoto[];
  backHref?: string;
  backLabel?: string;
  returnLabel?: string;
}) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const walls = useMemo(() => {
    const w: RoomPhoto[][] = [];
    let cur: RoomPhoto[] = [];
    photos.forEach((p, i) => {
      cur.push(p);
      const target = i % 6 < 3 ? 3 : 4;
      if (cur.length === target) {
        w.push(cur);
        cur = [];
      }
    });
    if (cur.length) w.push(cur);
    return w;
  }, [photos]);

  return (
    <>
      <HallTokens />

      <div style={{ position: "relative", background: "var(--ex-paper)", minHeight: "calc(100dvh - var(--hall-nav-offset, 80px))" }}>
        {/* top bar */}
        <div
          style={{
            position: "sticky",
            top: 0,
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

        {/* wall-text */}
        {tagline && (
          <div style={{ maxWidth: 720, margin: "60px auto 40px", padding: "0 32px", textAlign: "center" }}>
            <div
              style={{
                ...fontRole("labels"),
                fontSize: 9,
                color: "var(--ex-ink-soft)",
                letterSpacing: 3,
                marginBottom: 12,
              }}
            >
              — Wall text —
            </div>
            <div
              style={{
                ...fontRole("headings"),
                fontSize: 20,
                color: "var(--ex-ink)",
                lineHeight: 1.5,
              }}
            >
              {tagline}
            </div>
            <div style={{ width: 40, height: 1, background: "var(--ex-ink-soft)", margin: "20px auto" }} />
          </div>
        )}

        {/* walls */}
        <div style={{ maxWidth: 1240, margin: "0 auto", padding: "0 32px 80px" }}>
          {walls.map((wall, wi) => (
            <div
              key={wi}
              style={{
                display: "flex",
                alignItems: "flex-end",
                justifyContent: "center",
                gap: 40,
                marginBottom: 80,
                minHeight: 360,
                paddingBottom: 20,
                borderBottom: "1px solid var(--ex-ink-faint)",
                flexWrap: "wrap",
              }}
            >
              {wall.map((p, pi) => {
                const baseHeight = [300, 340, 280, 360, 310][pi % 5];
                const offsetY = [0, 20, 40, 10, 30][(wi + pi) % 5];
                const aspect = p.width && p.height ? p.width / p.height : 1.33;
                const width = Math.min(baseHeight * aspect, 380);
                const globalIndex = photos.indexOf(p);
                return (
                  <button
                    key={p.id}
                    onClick={() => setLightboxIndex(globalIndex)}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 10,
                      transform: `translateY(${offsetY}px)`,
                      cursor: "pointer",
                      background: "transparent",
                      border: "none",
                      padding: 0,
                    }}
                  >
                    <div
                      style={{
                        width,
                        height: baseHeight,
                        padding: 10,
                        background: "#fff",
                        boxShadow:
                          "0 14px 30px rgba(30,25,20,0.10), 0 2px 4px rgba(30,25,20,0.05)",
                        transition: "transform 320ms ease-out, box-shadow 320ms",
                        position: "relative",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = "translateY(-4px)";
                        e.currentTarget.style.boxShadow =
                          "0 22px 42px rgba(30,25,20,0.14), 0 3px 8px rgba(30,25,20,0.08)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = "";
                        e.currentTarget.style.boxShadow =
                          "0 14px 30px rgba(30,25,20,0.10), 0 2px 4px rgba(30,25,20,0.05)";
                      }}
                    >
                      <div style={{ position: "relative", width: "100%", height: "100%" }}>
                        <Image
                          src={p.thumbnailUrl}
                          alt={p.title ?? ""}
                          fill
                          sizes="(max-width: 768px) 50vw, 400px"
                          style={{ objectFit: "cover" }}
                        />
                      </div>
                    </div>
                    <div style={{ width, textAlign: "left", paddingLeft: 2 }}>
                      <div
                        style={{
                          ...fontRole("headings"),
                                    fontSize: 13,
                          color: "var(--ex-ink)",
                        }}
                      >
                        {p.title ?? "Untitled"}
                      </div>
                      {(p.location || p.createdAt) && (
                        <div
                          style={{
                            ...fontRole("labels"),
                            fontSize: 8,
                            color: "var(--ex-ink-soft)",
                            letterSpacing: 1,
                            marginTop: 2,
                          }}
                        >
                          {[p.location, formatYear(p.createdAt)].filter(Boolean).join(" · ")}
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        <div
          style={{
            textAlign: "center",
            padding: "0 32px 80px",
            ...fontRole("headings"),
            fontSize: 14,
            color: "var(--ex-ink-soft)",
          }}
        >
          — end of room —
          <div style={{ marginTop: 10 }}>
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
          </div>
        </div>
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
    return new Date(iso).getFullYear().toString();
  } catch {
    return "";
  }
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
