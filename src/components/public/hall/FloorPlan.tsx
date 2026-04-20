"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { fontRole } from "@/lib/theme/role-style";

export type HallGallery = {
  id: string;
  title: string;
  slug: string;
  tagline: string;
  accentColor: string | null;
  count: number;
  x: number;
  y: number;
  w: number;
  h: number;
  thumbs: string[];
};

const FLOOR_W = 1200;
const FLOOR_H = 820;

export default function FloorPlan({
  galleries,
  totalPhotos,
}: {
  galleries: HallGallery[];
  totalPhotos: number;
}) {
  const router = useRouter();
  const vpRef = useRef<HTMLDivElement>(null);
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [view, setView] = useState({ x: 0, y: 0, s: 1 });
  const [zooming, setZooming] = useState<string | null>(null);
  const dragRef = useRef<{ x: number; y: number; vx: number; vy: number } | null>(null);
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    if (galleries.length > 0) {
      galleries.slice(0, 6).forEach((g) => {
        router.prefetch(`/hall/${g.slug}`);
      });
    }
  }, [galleries, router]);

  useEffect(() => {
    const fit = () => {
      const vp = vpRef.current;
      if (!vp) return;
      const rect = vp.getBoundingClientRect();
      const availW = rect.width - 96;
      const availH = rect.height - 96;
      const s = Math.min(1, Math.min(availW / FLOOR_W, availH / FLOOR_H));
      setView({ x: 0, y: 0, s });
    };
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, []);

  useEffect(() => {
    const vp = vpRef.current;
    if (!vp) return;
    const onWheel = (e: WheelEvent) => {
      if (zooming) return;
      e.preventDefault();
      if (e.ctrlKey || e.metaKey) {
        const factor = Math.exp(-e.deltaY * 0.01);
        setView((v) => {
          const rect = vp.getBoundingClientRect();
          const cx = e.clientX - rect.left;
          const cy = e.clientY - rect.top;
          const newS = Math.min(2.5, Math.max(0.4, v.s * factor));
          const k = newS / v.s;
          return { s: newS, x: cx - (cx - v.x) * k, y: cy - (cy - v.y) * k };
        });
      } else {
        setView((v) => ({ ...v, x: v.x - e.deltaX, y: v.y - e.deltaY }));
      }
    };
    vp.addEventListener("wheel", onWheel, { passive: false });
    return () => vp.removeEventListener("wheel", onWheel);
  }, [zooming]);

  const onPointerDown = (e: React.PointerEvent) => {
    if (zooming) return;
    if ((e.target as HTMLElement).closest("[data-room]")) return;
    dragRef.current = { x: e.clientX, y: e.clientY, vx: view.x, vy: view.y };
    setDragging(true);
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current) return;
    setView((v) => ({
      ...v,
      x: dragRef.current!.vx + (e.clientX - dragRef.current!.x),
      y: dragRef.current!.vy + (e.clientY - dragRef.current!.y),
    }));
  };
  const onPointerUp = () => {
    dragRef.current = null;
    setDragging(false);
  };

  const enterRoom = useCallback(
    (g: HallGallery) => {
      setZooming(g.id);
      setTimeout(() => router.push(`/hall/${g.slug}`), 620);
    },
    [router],
  );

  const floorTransform = useMemo(() => {
    if (zooming) {
      const g = galleries.find((x) => x.id === zooming);
      if (!g) return "";
      const cx = ((g.x + g.w / 2) / 100) * FLOOR_W;
      const cy = ((g.y + g.h / 2) / 100) * FLOOR_H;
      const tx = FLOOR_W / 2 - cx;
      const ty = FLOOR_H / 2 - cy;
      return `translate(${tx}px, ${ty}px) scale(3.2)`;
    }
    return `translate(${view.x}px, ${view.y}px) scale(${view.s})`;
  }, [zooming, view, galleries]);

  const hovered = hoverId ? galleries.find((g) => g.id === hoverId) : null;

  return (
    <>
      <HallTokens />
      <div
        ref={vpRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        style={{
          position: "absolute",
          inset: 0,
          overflow: "hidden",
          cursor: dragging ? "grabbing" : zooming ? "default" : "grab",
          background: "var(--ex-paper)",
          touchAction: "none",
        }}
      >
        <div
          style={{
            position: "absolute",
            left: "50%",
            top: 40,
            width: FLOOR_W,
            height: FLOOR_H,
            marginLeft: -FLOOR_W / 2,
            transform: floorTransform,
            transition: zooming
              ? "transform 620ms cubic-bezier(.55,.15,.35,1)"
              : dragging
                ? "none"
                : "transform 120ms ease-out",
            transformOrigin: "top center",
            opacity: zooming ? 0 : 1,
          }}
        >
          <FloorMarks />

          {galleries.map((g) => (
            <RoomBox
              key={g.id}
              gallery={g}
              hovered={hoverId === g.id}
              onHover={() => setHoverId(g.id)}
              onLeave={() => setHoverId(null)}
              onClick={() => enterRoom(g)}
            />
          ))}

          {/* title block */}
          <div style={{ position: "absolute", top: 36, left: 48, pointerEvents: "none" }}>
            <div
              style={{
                ...fontRole("labels"),
                fontSize: 9,
                color: "var(--ex-ink-soft)",
                letterSpacing: 2,
              }}
            >
              Plan View · 1:1
            </div>
            <div
              style={{
                ...fontRole("headings"),
                  fontSize: 22,
                color: "var(--ex-ink)",
                marginTop: 6,
              }}
            >
              The Quiet Wing
            </div>
          </div>

          {/* compass mark */}
          <div
            style={{
              position: "absolute",
              top: 36,
              right: 48,
              width: 64,
              height: 64,
              border: "1px solid var(--ex-ink-faint)",
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--ex-ink-soft)",
              ...fontRole("headings"),
              fontSize: 11,
              pointerEvents: "none",
            }}
          >
            <div style={{ position: "absolute", top: 4, fontSize: 9 }}>N</div>
            <div style={{ position: "absolute", bottom: 4, fontSize: 9 }}>S</div>
            <div style={{ position: "absolute", left: 6, fontSize: 9 }}>W</div>
            <div style={{ position: "absolute", right: 6, fontSize: 9 }}>E</div>
            <div style={{ width: 1, height: 44, background: "var(--ex-ink-soft)" }} />
          </div>

          {/* scale bar */}
          <div
            style={{
              position: "absolute",
              bottom: 36,
              left: 48,
              ...fontRole("labels"),
              fontSize: 9,
              color: "var(--ex-ink-soft)",
              letterSpacing: 1,
              display: "flex",
              alignItems: "center",
              gap: 10,
              pointerEvents: "none",
            }}
          >
            <div style={{ width: 60, height: 1, background: "var(--ex-ink-soft)" }} />
            <span>
              {galleries.length} galleries · {totalPhotos} photos
            </span>
          </div>
        </div>

        <InstructionOverlay />

        {hovered && !zooming && (
          <div
            style={{
              position: "absolute",
              bottom: 30,
              left: "50%",
              transform: "translateX(-50%)",
              background: "var(--ex-ink)",
              color: "var(--ex-paper)",
              padding: "10px 18px",
              ...fontRole("headings"),
              fontSize: 15,
              pointerEvents: "none",
              boxShadow: "0 8px 24px rgba(0,0,0,0.15)",
              letterSpacing: 0.3,
            }}
          >
            {hovered.title}{" "}
            <span
              style={{
                fontStyle: "normal",
                ...fontRole("labels"),
                fontSize: 10,
                opacity: 0.6,
                marginLeft: 10,
              }}
            >
              {hovered.count} photos
            </span>
          </div>
        )}

        {galleries.length === 0 && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              ...fontRole("headings"),
              fontSize: 20,
              color: "var(--ex-ink-soft)",
            }}
          >
            <div style={{ textAlign: "center" }}>
              <p>The hall is empty — no published galleries yet.</p>
              <Link
                href="/admin/galleries"
                style={{
                  marginTop: 20,
                  display: "inline-block",
                  ...fontRole("labels"),
                  fontSize: 10,
                  letterSpacing: 2,
                  color: "var(--ex-accent)",
                }}
              >
                OPEN ADMIN →
              </Link>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

const THUMB_LAYOUTS: Record<number, { left: string; top: string; rot: number }[]> = {
  1: [{ left: "28%", top: "24%", rot: -2 }],
  2: [
    { left: "12%", top: "20%", rot: -2 },
    { left: "52%", top: "30%", rot: 3 },
  ],
  3: [
    { left: "10%", top: "15%", rot: -3 },
    { left: "54%", top: "22%", rot: 2 },
    { left: "28%", top: "50%", rot: -2 },
  ],
  4: [
    { left: "8%", top: "12%", rot: -3 },
    { left: "54%", top: "18%", rot: 2 },
    { left: "14%", top: "50%", rot: 3 },
    { left: "56%", top: "52%", rot: -2 },
  ],
};

function RoomBox({
  gallery,
  hovered,
  onHover,
  onLeave,
  onClick,
}: {
  gallery: HallGallery;
  hovered: boolean;
  onHover: () => void;
  onLeave: () => void;
  onClick: () => void;
}) {
  const px = (gallery.x / 100) * FLOOR_W;
  const py = (gallery.y / 100) * FLOOR_H;
  const pw = (gallery.w / 100) * FLOOR_W;
  const ph = (gallery.h / 100) * FLOOR_H;

  const thumbs = gallery.thumbs.slice(0, 4);
  const scatter = THUMB_LAYOUTS[thumbs.length] ?? [];
  const thumbScale = thumbs.length <= 2 ? 0.32 : thumbs.length === 3 ? 0.3 : 0.28;
  const thumbHScale = thumbs.length <= 2 ? 0.42 : thumbs.length === 3 ? 0.36 : 0.32;
  const thumbMaxW = thumbs.length <= 2 ? 70 : thumbs.length === 3 ? 58 : 50;
  const thumbMaxH = thumbs.length <= 2 ? 55 : thumbs.length === 3 ? 46 : 40;

  return (
    <div
      data-room={gallery.id}
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
      onClick={onClick}
      style={{
        position: "absolute",
        left: px,
        top: py,
        width: pw,
        height: ph,
        cursor: "pointer",
        transition: "transform 240ms ease-out",
        transform: hovered ? "translate(0, -2px)" : "none",
        zIndex: hovered ? 5 : 1,
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: hovered ? "var(--ex-paper-hover)" : "var(--ex-paper-room)",
          border: `1px solid ${hovered && gallery.accentColor ? gallery.accentColor : "var(--ex-ink-faint)"}`,
          borderRadius: 4,
          boxShadow: hovered
            ? "0 12px 32px rgba(30,25,20,0.14), 0 2px 8px rgba(30,25,20,0.06)"
            : "0 1px 2px rgba(30,25,20,0.03)",
          transition: "all 240ms ease-out",
          overflow: "hidden",
        }}
      >
        {pw > 100 && ph > 80 &&
          thumbs.map((src, i) => {
            const spot = scatter[i];
            if (!spot) return null;
            return (
              <div
                key={`${gallery.id}-thumb-${i}`}
                style={{
                  position: "absolute",
                  left: spot.left,
                  top: spot.top,
                  width: Math.min(pw * thumbScale, thumbMaxW),
                  height: Math.min(ph * thumbHScale, thumbMaxH),
                  background: "#fff",
                  padding: 3,
                  transform: `rotate(${spot.rot}deg)`,
                  boxShadow: hovered
                    ? "0 4px 12px rgba(0,0,0,0.2)"
                    : "0 2px 6px rgba(0,0,0,0.1)",
                  border: "0.5px solid rgba(0,0,0,0.1)",
                  transition: "all 300ms ease-out",
                  opacity: hovered ? 1 : 0.92,
                }}
              >
                <Image
                  src={src}
                  alt=""
                  fill
                  sizes="80px"
                  style={{
                    objectFit: "cover",
                    filter: hovered ? "none" : "saturate(0.88)",
                    transition: "filter 300ms",
                  }}
                />
              </div>
            );
          })}
      </div>

      {/* label */}
      <div
        style={{
          position: "absolute",
          bottom: ph > 100 ? 8 : -22,
          left: 8,
          right: 8,
          ...fontRole("headings"),
          fontSize: Math.min(pw, ph) > 120 ? 14 : 11,
          color: hovered && gallery.accentColor ? gallery.accentColor : "var(--ex-ink)",
          lineHeight: 1.1,
          pointerEvents: "none",
          transition: "color 220ms",
        }}
      >
        {gallery.title}
        {pw > 130 && ph > 100 && (
          <div
            style={{
              ...fontRole("labels"),
              fontSize: 8,
              color: "var(--ex-ink-soft)",
              fontStyle: "normal",
              letterSpacing: 1,
              marginTop: 2,
            }}
          >
            {gallery.count} works
          </div>
        )}
      </div>
    </div>
  );
}

function FloorMarks() {
  return (
    <svg
      width={FLOOR_W}
      height={FLOOR_H}
      style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
    >
      <rect
        x={1}
        y={1}
        width={FLOOR_W - 2}
        height={FLOOR_H - 2}
        fill="none"
        stroke="var(--ex-ink-faint)"
        strokeWidth={1}
      />
      <rect
        x={8}
        y={8}
        width={FLOOR_W - 16}
        height={FLOOR_H - 16}
        fill="none"
        stroke="var(--ex-ink-faint)"
        strokeWidth={0.5}
        opacity={0.6}
      />
      {Array.from({ length: 40 }).map((_, i) => (
        <line
          key={i}
          x1={20 + i * 30}
          y1={800}
          x2={30 + i * 30}
          y2={815}
          stroke="var(--ex-ink-soft)"
          strokeWidth={0.5}
          opacity={0.35}
        />
      ))}
      <g transform={`translate(${FLOOR_W / 2}, 810)`}>
        <path
          d="M 0 -14 L 0 0 M -6 -7 L 0 0 L 6 -7"
          fill="none"
          stroke="var(--ex-ink-soft)"
          strokeWidth={1}
        />
        <text
          x={0}
          y={-20}
          textAnchor="middle"
          fontFamily="var(--theme-font-headings)"
          fontSize={11}
          fontStyle="italic"
          fill="var(--ex-ink-soft)"
        >
          entrance
        </text>
      </g>
    </svg>
  );
}

function InstructionOverlay() {
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setVisible(false), 6000);
    return () => clearTimeout(t);
  }, []);
  return (
    <div
      style={{
        position: "absolute",
        bottom: 20,
        right: 20,
        ...fontRole("labels"),
        fontSize: 10,
        color: "var(--ex-ink-soft)",
        letterSpacing: 1,
        opacity: visible ? 1 : 0,
        transition: "opacity 1s",
        textAlign: "right",
        lineHeight: 1.8,
        pointerEvents: "none",
      }}
    >
      <div>Drag to pan</div>
      <div>⌘ + scroll to zoom</div>
      <div>Click a room to enter</div>
    </div>
  );
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
      @keyframes hallFadeIn {
        from { opacity: 0; transform: scale(1.04); }
        to { opacity: 1; transform: scale(1); }
      }
    `}</style>
  );
}
