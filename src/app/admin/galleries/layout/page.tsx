"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, RotateCcw, Wand2 } from "lucide-react";
import { Button, Card, Field, Input, Pill, SectionLabel, Topbar } from "@/components/admin/ui";
import { useMessage } from "@/lib/hooks/useMessage";
import siteConfig from "@/lib/site.config";

const FLOOR_W = 1200;
const FLOOR_H = 820;

type Gallery = {
  id: string;
  title: string;
  slug: string;
  isPublished: boolean;
  accentColor: string | null;
  tagline: string | null;
  description: string | null;
  floorX: number | null;
  floorY: number | null;
  floorW: number | null;
  floorH: number | null;
  photoCount?: number;
};

type Layout = { x: number; y: number; w: number; h: number };

type DragState = {
  id: string;
  mode: "move" | "resize";
  startClientX: number;
  startClientY: number;
  startLayout: Layout;
  canvasW: number;
  canvasH: number;
};

export default function FloorLayoutEditor() {
  const [galleries, setGalleries] = useState<Gallery[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const canvasRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragState | null>(null);
  const [, forceRender] = useState(0);
  const { message, showSuccess, showError, alertClass } = useMessage();

  const fetchGalleries = useCallback(async () => {
    const [galleryRes, photosRes] = await Promise.all([
      fetch("/api/galleries"),
      fetch("/api/photos"),
    ]);
    const galleryData = (await galleryRes.json()) as Gallery[];
    const photoData = (await photosRes.json()) as { galleryId: string }[];
    const counts = new Map<string, number>();
    for (const p of photoData) {
      counts.set(p.galleryId, (counts.get(p.galleryId) ?? 0) + 1);
    }
    const published = galleryData
      .filter((g) => g.isPublished)
      .map((g) => ({ ...g, photoCount: counts.get(g.id) ?? 0 }));
    setGalleries(published);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchGalleries();
  }, [fetchGalleries]);

  const effectiveLayout = useCallback(
    (g: Gallery, all: Gallery[]): Layout => {
      if (g.floorX != null && g.floorY != null && g.floorW != null && g.floorH != null) {
        return { x: g.floorX, y: g.floorY, w: g.floorW, h: g.floorH };
      }
      const unplaced = all.filter((x) => x.floorX == null);
      const i = unplaced.findIndex((x) => x.id === g.id);
      return autoPlace(i, unplaced.length);
    },
    [],
  );

  const savePosition = useCallback(
    async (id: string, next: Layout | null) => {
      try {
        const res = await fetch("/api/galleries", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id,
            floorX: next?.x ?? null,
            floorY: next?.y ?? null,
            floorW: next?.w ?? null,
            floorH: next?.h ?? null,
          }),
        });
        if (!res.ok) throw new Error("Save failed");
      } catch {
        showError("Failed to save position.");
        fetchGalleries();
      }
    },
    [fetchGalleries, showError],
  );

  const handleReset = useCallback(
    async (id: string) => {
      setGalleries((prev) =>
        prev.map((g) =>
          g.id === id
            ? { ...g, floorX: null, floorY: null, floorW: null, floorH: null }
            : g,
        ),
      );
      await savePosition(id, null);
      showSuccess("Reset to auto-layout.");
    },
    [savePosition, showSuccess],
  );

  const handleAutoPlaceAll = useCallback(async () => {
    if (!confirm("Replace all room positions with the auto-layout?")) return;
    const unplaced = galleries;
    const updates = unplaced.map((g, i) => {
      const layout = autoPlace(i, unplaced.length);
      return { id: g.id, layout };
    });

    setGalleries((prev) =>
      prev.map((g) => {
        const u = updates.find((x) => x.id === g.id);
        if (!u) return g;
        return { ...g, floorX: u.layout.x, floorY: u.layout.y, floorW: u.layout.w, floorH: u.layout.h };
      }),
    );

    for (const u of updates) {
      await savePosition(u.id, u.layout);
    }
    showSuccess("Auto-placed all rooms.");
  }, [galleries, savePosition, showSuccess]);

  const onPointerDown = (
    e: React.PointerEvent,
    gallery: Gallery,
    mode: "move" | "resize",
  ) => {
    e.preventDefault();
    e.stopPropagation();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const current = effectiveLayout(gallery, galleries);
    // Commit the effective layout if it was auto — makes the first drag persist.
    if (gallery.floorX == null) {
      setGalleries((prev) =>
        prev.map((g) =>
          g.id === gallery.id
            ? { ...g, floorX: current.x, floorY: current.y, floorW: current.w, floorH: current.h }
            : g,
        ),
      );
    }
    dragRef.current = {
      id: gallery.id,
      mode,
      startClientX: e.clientX,
      startClientY: e.clientY,
      startLayout: current,
      canvasW: rect.width,
      canvasH: rect.height,
    };
    setSelectedId(gallery.id);
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const d = dragRef.current;
    if (!d) return;
    const dxPct = ((e.clientX - d.startClientX) / d.canvasW) * 100;
    const dyPct = ((e.clientY - d.startClientY) / d.canvasH) * 100;

    setGalleries((prev) =>
      prev.map((g) => {
        if (g.id !== d.id) return g;
        if (d.mode === "move") {
          const w = g.floorW ?? d.startLayout.w;
          const h = g.floorH ?? d.startLayout.h;
          return {
            ...g,
            floorX: clamp(d.startLayout.x + dxPct, 0, 100 - w),
            floorY: clamp(d.startLayout.y + dyPct, 0, 100 - h),
          };
        }
        const x = g.floorX ?? d.startLayout.x;
        const y = g.floorY ?? d.startLayout.y;
        return {
          ...g,
          floorW: clamp(d.startLayout.w + dxPct, 4, 100 - x),
          floorH: clamp(d.startLayout.h + dyPct, 4, 100 - y),
        };
      }),
    );
    forceRender((n) => n + 1);
  };

  const onPointerUp = (e: React.PointerEvent) => {
    const d = dragRef.current;
    dragRef.current = null;
    if (!d) return;
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {}
    const g = galleries.find((x) => x.id === d.id);
    if (!g || g.floorX == null || g.floorY == null || g.floorW == null || g.floorH == null) return;
    savePosition(g.id, { x: g.floorX, y: g.floorY, w: g.floorW, h: g.floorH });
  };

  const onPropertyChange = (id: string, key: "x" | "y" | "w" | "h", value: string) => {
    const n = parseFloat(value);
    if (!Number.isFinite(n)) return;
    setGalleries((prev) =>
      prev.map((g) => {
        if (g.id !== id) return g;
        const current = effectiveLayout(g, prev);
        const next = { ...current, [key]: clamp(n, 0, 100) };
        return { ...g, floorX: next.x, floorY: next.y, floorW: next.w, floorH: next.h };
      }),
    );
  };

  const onPropertyBlur = (id: string) => {
    const g = galleries.find((x) => x.id === id);
    if (!g || g.floorX == null || g.floorY == null || g.floorW == null || g.floorH == null) return;
    savePosition(id, { x: g.floorX, y: g.floorY, w: g.floorW, h: g.floorH });
  };

  const selected = selectedId ? galleries.find((g) => g.id === selectedId) : null;
  const placedCount = galleries.filter((g) => g.floorX != null).length;

  return (
    <div className="-m-8 min-h-[calc(100vh-0px)] bg-admin-bg">
      <Topbar
        title="Floor plan layout"
        subtitle={`${placedCount} of ${galleries.length} rooms manually placed · drag to move · resize from bottom-right`}
        actions={
          <div className="flex items-center gap-2">
            <Link
              href="/admin/galleries"
              className="text-[12px] font-mono uppercase tracking-[1.5px] text-admin-ink-soft hover:text-admin-ink flex items-center gap-1.5"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Galleries
            </Link>
            <Button
              kind="ghost"
              onClick={handleAutoPlaceAll}
              icon={<Wand2 className="h-3.5 w-3.5" />}
            >
              Auto-place all
            </Button>
            <Link
              href="/hall"
              target="_blank"
              className="text-[12px] font-mono uppercase tracking-[1.5px] text-admin-accent hover:underline"
            >
              Preview /hall ↗
            </Link>
          </div>
        }
      />

      <div className="p-7">
        {message && <div className={`${alertClass} mb-4`}>{message.text}</div>}

        {loading ? (
          <p className="text-sm text-admin-ink-soft">Loading…</p>
        ) : galleries.length === 0 ? (
          <Card>
            <p className="text-sm text-admin-ink-soft">
              No published {siteConfig.labels.galleries.toLowerCase()} yet. Publish a gallery first, then come back to arrange them.
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-[1fr_280px] gap-5">
            {/* canvas */}
            <Card padded={false}>
              <div className="p-4 border-b border-admin-border">
                <SectionLabel>Canvas</SectionLabel>
              </div>
              <div
                ref={canvasRef}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerCancel={onPointerUp}
                onClick={(e) => {
                  if (e.target === e.currentTarget) setSelectedId(null);
                }}
                className="relative mx-auto my-4 bg-admin-surface-2 border border-admin-border-strong"
                style={{
                  width: "min(100%, 1000px)",
                  aspectRatio: `${FLOOR_W} / ${FLOOR_H}`,
                  touchAction: "none",
                  userSelect: "none",
                }}
              >
                {galleries.map((g) => {
                  const layout = effectiveLayout(g, galleries);
                  const isSelected = selectedId === g.id;
                  const isUnplaced = g.floorX == null;
                  const border = isSelected
                    ? "2px solid var(--color-admin-accent)"
                    : isUnplaced
                      ? "1px dashed var(--color-admin-ink-faint)"
                      : `1px solid ${g.accentColor ?? "var(--color-admin-ink-soft)"}`;
                  return (
                    <div
                      key={g.id}
                      onPointerDown={(e) => onPointerDown(e, g, "move")}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedId(g.id);
                      }}
                      style={{
                        position: "absolute",
                        left: `${layout.x}%`,
                        top: `${layout.y}%`,
                        width: `${layout.w}%`,
                        height: `${layout.h}%`,
                        background: isSelected
                          ? "color-mix(in oklab, var(--color-admin-accent) 10%, #fff)"
                          : "#fff",
                        border,
                        borderRadius: 3,
                        cursor: dragRef.current?.mode === "move" ? "grabbing" : "grab",
                        opacity: isUnplaced ? 0.75 : 1,
                      }}
                    >
                      <div
                        className="absolute inset-0 flex flex-col items-center justify-center px-1 text-center pointer-events-none"
                        style={{ fontFamily: "var(--font-serif)" }}
                      >
                        <span
                          className="truncate max-w-full"
                          style={{
                            fontSize: "clamp(9px, 1.6vw, 14px)",
                            fontStyle: "italic",
                            color: "var(--color-admin-ink)",
                          }}
                        >
                          {g.title}
                        </span>
                        <span
                          className="font-mono"
                          style={{
                            fontSize: 8,
                            letterSpacing: 1,
                            color: "var(--color-admin-ink-soft)",
                            marginTop: 2,
                          }}
                        >
                          {g.photoCount ?? 0} WORKS
                        </span>
                      </div>
                      {/* resize handle */}
                      <div
                        onPointerDown={(e) => onPointerDown(e, g, "resize")}
                        style={{
                          position: "absolute",
                          right: -6,
                          bottom: -6,
                          width: 14,
                          height: 14,
                          background: isSelected ? "var(--color-admin-accent)" : "#fff",
                          border: "1px solid var(--color-admin-ink-soft)",
                          borderRadius: 2,
                          cursor: "nwse-resize",
                        }}
                      />
                    </div>
                  );
                })}
              </div>
              <div className="px-5 pb-4 text-[12px] text-admin-ink-soft">
                Dashed outline = auto-placed (not saved). Click or drag to commit a
                manual position.
              </div>
            </Card>

            {/* sidebar */}
            <div className="space-y-4">
              <Card>
                <SectionLabel>Rooms</SectionLabel>
                <ul className="mt-3 space-y-1">
                  {galleries.map((g) => {
                    const placed = g.floorX != null;
                    return (
                      <li key={g.id}>
                        <button
                          onClick={() => setSelectedId(g.id)}
                          className={`w-full flex items-center justify-between gap-2 px-2 py-1.5 rounded-md text-left text-[13px] ${
                            selectedId === g.id
                              ? "bg-admin-accent-soft text-admin-ink"
                              : "hover:bg-admin-surface-2 text-admin-ink"
                          }`}
                        >
                          <span className="truncate flex items-center gap-2">
                            {g.accentColor && (
                              <span
                                className="inline-block h-2.5 w-2.5 rounded-full shrink-0"
                                style={{ background: g.accentColor }}
                              />
                            )}
                            {g.title}
                          </span>
                          <Pill tone={placed ? "success" : "neutral"}>
                            {placed ? "placed" : "auto"}
                          </Pill>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </Card>

              {selected && (
                <Card>
                  <div className="flex items-center justify-between">
                    <SectionLabel>Position</SectionLabel>
                    {selected.floorX != null && (
                      <button
                        onClick={() => handleReset(selected.id)}
                        className="text-[11px] font-mono uppercase tracking-[1.5px] text-admin-ink-soft hover:text-admin-danger flex items-center gap-1"
                      >
                        <RotateCcw className="h-3 w-3" /> Reset
                      </button>
                    )}
                  </div>
                  <div className="mt-3 font-serif italic text-[15px] text-admin-ink">
                    {selected.title}
                  </div>
                  {(() => {
                    const layout = effectiveLayout(selected, galleries);
                    return (
                      <div className="mt-3 grid grid-cols-2 gap-3">
                        <Field label="X %" htmlFor="fp-x">
                          <Input
                            id="fp-x"
                            type="number"
                            step="0.5"
                            min={0}
                            max={100}
                            value={layout.x.toFixed(1)}
                            onChange={(e) => onPropertyChange(selected.id, "x", e.target.value)}
                            onBlur={() => onPropertyBlur(selected.id)}
                          />
                        </Field>
                        <Field label="Y %" htmlFor="fp-y">
                          <Input
                            id="fp-y"
                            type="number"
                            step="0.5"
                            min={0}
                            max={100}
                            value={layout.y.toFixed(1)}
                            onChange={(e) => onPropertyChange(selected.id, "y", e.target.value)}
                            onBlur={() => onPropertyBlur(selected.id)}
                          />
                        </Field>
                        <Field label="W %" htmlFor="fp-w">
                          <Input
                            id="fp-w"
                            type="number"
                            step="0.5"
                            min={4}
                            max={100}
                            value={layout.w.toFixed(1)}
                            onChange={(e) => onPropertyChange(selected.id, "w", e.target.value)}
                            onBlur={() => onPropertyBlur(selected.id)}
                          />
                        </Field>
                        <Field label="H %" htmlFor="fp-h">
                          <Input
                            id="fp-h"
                            type="number"
                            step="0.5"
                            min={4}
                            max={100}
                            value={layout.h.toFixed(1)}
                            onChange={(e) => onPropertyChange(selected.id, "h", e.target.value)}
                            onBlur={() => onPropertyBlur(selected.id)}
                          />
                        </Field>
                      </div>
                    );
                  })()}
                </Card>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function autoPlace(index: number, total: number): Layout {
  const n = Math.max(1, total);
  const cols = n <= 3 ? n : n <= 6 ? 3 : n <= 9 ? 3 : 4;
  const rows = Math.ceil(n / cols);
  const marginX = 10;
  const marginY = 14;
  const gapX = 3;
  const gapY = 5;
  const cellW = (100 - marginX * 2 - gapX * (cols - 1)) / cols;
  const cellH = (100 - marginY * 2 - gapY * (rows - 1)) / rows;
  const scale = 0.8;
  const w = cellW * scale;
  const h = cellH * scale;
  const col = index % cols;
  const row = Math.floor(index / cols);
  const cx = marginX + col * (cellW + gapX) + cellW / 2;
  const cy = marginY + row * (cellH + gapY) + cellH / 2;
  return { x: cx - w / 2, y: cy - h / 2, w, h };
}

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}
