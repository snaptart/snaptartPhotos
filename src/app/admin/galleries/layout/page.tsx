"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Crosshair, MapPin, X } from "lucide-react";
import { Button, Card, Pill, SectionLabel, Topbar } from "@/components/admin/ui";
import { useMessage } from "@/lib/hooks/useMessage";
import siteConfig from "@/lib/site.config";
import {
  MAP_W,
  MAP_H,
  createMollweideProjection,
  paletteFor,
  loadLandPath,
  buildGraticulePath,
  buildSpherePath,
} from "@/lib/fieldmap/map";

type Gallery = {
  id: string;
  title: string;
  slug: string;
  isPublished: boolean;
  accentColor: string | null;
  tagline: string | null;
  description: string | null;
  latitude: number | null;
  longitude: number | null;
  position: number;
};

const PIN_FALLBACK = "#5b6470";

export default function FieldMapPlacementEditor() {
  const [galleries, setGalleries] = useState<Gallery[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [placingId, setPlacingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState({ x: 0, y: 0, s: 1 });
  const [worldPath, setWorldPath] = useState<string | null>(null);
  const [graticulePath, setGraticulePath] = useState<string | null>(null);
  const [spherePath, setSpherePath] = useState<string | null>(null);

  const vpRef = useRef<HTMLDivElement | null>(null);
  const dragPinRef = useRef<{ galleryId: string } | null>(null);
  const panDragRef = useRef<{ x: number; y: number; vx: number; vy: number } | null>(null);
  const projection = useMemo(() => createMollweideProjection(), []);
  const palette = paletteFor("mono");

  const { message, showSuccess, showError, alertClass } = useMessage();

  const fetchGalleries = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/galleries");
    if (!res.ok) {
      showError("Failed to load galleries.");
      setLoading(false);
      return;
    }
    const items = (await res.json()) as Gallery[];
    setGalleries(items);
    setLoading(false);
  }, [showError]);

  useEffect(() => {
    fetchGalleries();
  }, [fetchGalleries]);

  useEffect(() => {
    setGraticulePath(buildGraticulePath(projection));
    setSpherePath(buildSpherePath(projection));
    loadLandPath(projection).then(setWorldPath);
  }, [projection]);

  useEffect(() => {
    const fit = () => {
      const vp = vpRef.current;
      if (!vp) return;
      const r = vp.getBoundingClientRect();
      const s = Math.min((r.width - 40) / MAP_W, (r.height - 40) / MAP_H);
      setView({ s, x: (r.width - MAP_W * s) / 2, y: (r.height - MAP_H * s) / 2 });
    };
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, []);

  const placed = galleries.filter((g) => g.latitude != null && g.longitude != null);
  const unplaced = galleries.filter((g) => g.latitude == null || g.longitude == null);

  const projectedPins = useMemo(() => {
    return placed.map((g) => {
      const [px, py] = projection([g.longitude!, g.latitude!]) ?? [0, 0];
      return { gallery: g, px, py };
    });
  }, [placed, projection]);

  const saveCoords = useCallback(
    async (galleryId: string, latitude: number | null, longitude: number | null) => {
      setGalleries((prev) =>
        prev.map((g) => (g.id === galleryId ? { ...g, latitude, longitude } : g))
      );
      const res = await fetch("/api/galleries", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: galleryId, latitude, longitude }),
      });
      if (!res.ok) {
        showError("Save failed.");
        fetchGalleries();
      } else {
        showSuccess("Saved.");
      }
    },
    [showError, showSuccess, fetchGalleries]
  );

  const clientToLatLng = useCallback(
    (clientX: number, clientY: number): [number, number] | null => {
      const vp = vpRef.current;
      if (!vp) return null;
      const r = vp.getBoundingClientRect();
      const sx = (clientX - r.left - view.x) / view.s;
      const sy = (clientY - r.top - view.y) / view.s;
      if (!projection.invert) return null;
      const inv = projection.invert([sx, sy]);
      if (!inv) return null;
      return [inv[1], inv[0]];
    },
    [view, projection]
  );

  const onCanvasMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest("[data-pin]")) return;
    if (placingId) {
      const ll = clientToLatLng(e.clientX, e.clientY);
      if (ll) {
        saveCoords(placingId, ll[0], ll[1]);
        setPlacingId(null);
      }
      return;
    }
    panDragRef.current = { x: e.clientX, y: e.clientY, vx: view.x, vy: view.y };
  };

  const onCanvasMouseMove = (e: React.MouseEvent) => {
    if (dragPinRef.current) {
      const ll = clientToLatLng(e.clientX, e.clientY);
      if (!ll) return;
      const { galleryId } = dragPinRef.current;
      setGalleries((prev) =>
        prev.map((g) => (g.id === galleryId ? { ...g, latitude: ll[0], longitude: ll[1] } : g))
      );
      return;
    }
    if (panDragRef.current) {
      setView((v) => ({
        ...v,
        x: panDragRef.current!.vx + (e.clientX - panDragRef.current!.x),
        y: panDragRef.current!.vy + (e.clientY - panDragRef.current!.y),
      }));
    }
  };

  const onCanvasMouseUp = () => {
    if (dragPinRef.current) {
      const g = galleries.find((x) => x.id === dragPinRef.current!.galleryId);
      if (g && g.latitude != null && g.longitude != null) {
        saveCoords(g.id, g.latitude, g.longitude);
      }
      dragPinRef.current = null;
    }
    panDragRef.current = null;
  };

  useEffect(() => {
    const vp = vpRef.current;
    if (!vp) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (e.ctrlKey || e.metaKey || Math.abs(e.deltaY) > Math.abs(e.deltaX) * 2) {
        const f = Math.exp(-e.deltaY * 0.012);
        setView((v) => {
          const r = vp.getBoundingClientRect();
          const cx = e.clientX - r.left;
          const cy = e.clientY - r.top;
          const ns = Math.min(4, Math.max(0.4, v.s * f));
          const k = ns / v.s;
          return { s: ns, x: cx - (cx - v.x) * k, y: cy - (cy - v.y) * k };
        });
      } else {
        setView((v) => ({ ...v, x: v.x - e.deltaX, y: v.y - e.deltaY }));
      }
    };
    vp.addEventListener("wheel", onWheel, { passive: false });
    return () => vp.removeEventListener("wheel", onWheel);
  }, []);

  const startPinDrag = (gallery: Gallery) => (e: React.MouseEvent) => {
    e.stopPropagation();
    if (gallery.latitude == null || gallery.longitude == null) return;
    dragPinRef.current = { galleryId: gallery.id };
  };

  return (
    <div className="-m-8 min-h-[calc(100vh-0px)] bg-admin-bg">
      <Topbar
        title={`${siteConfig.labels.galleries} on the Field Map`}
        subtitle="Drag a pin to reposition · click Place to drop a new one"
        actions={
          <Link
            href="/admin/galleries"
            className="inline-flex items-center gap-1.5 text-[12px] font-mono uppercase tracking-[1.5px] text-admin-ink-soft hover:text-admin-ink"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back
          </Link>
        }
      />

      <div className="px-8 pb-8">
        {message && <div className={`${alertClass} mb-4`}>{message.text}</div>}

        <div className="grid grid-cols-[280px_1fr] gap-4 h-[calc(100vh-200px)]">
          <aside className="flex flex-col gap-4 min-h-0">
            <Card className="flex-1 min-h-0 overflow-y-auto">
              <SectionLabel>On the map ({placed.length})</SectionLabel>
              {placed.length === 0 ? (
                <div className="text-[12px] text-admin-ink-faint italic mt-2">No placed galleries yet.</div>
              ) : (
                <ul className="mt-2 flex flex-col gap-1">
                  {placed.map((g) => (
                    <li
                      key={g.id}
                      className={`rounded px-2 py-1.5 cursor-pointer flex items-center justify-between gap-2 ${
                        selectedId === g.id ? "bg-admin-accent-soft" : "hover:bg-admin-surface-2"
                      }`}
                      onClick={() => setSelectedId(g.id)}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className="inline-block h-2.5 w-2.5 rounded-full shrink-0"
                          style={{ background: g.accentColor ?? PIN_FALLBACK }}
                        />
                        <div className="min-w-0">
                          <div className="text-[12.5px] text-admin-ink truncate">{g.title}</div>
                          <div className="text-[10px] font-mono text-admin-ink-faint">
                            {g.latitude!.toFixed(2)}°{g.latitude! >= 0 ? "N" : "S"}{" "}
                            {g.longitude!.toFixed(2)}°{g.longitude! >= 0 ? "E" : "W"}
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        aria-label="Remove from map"
                        className="text-admin-ink-faint hover:text-admin-danger shrink-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          saveCoords(g.id, null, null);
                        }}
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <Card>
              <SectionLabel>Not placed ({unplaced.length})</SectionLabel>
              {unplaced.length === 0 ? (
                <div className="text-[12px] text-admin-ink-faint italic mt-2">All galleries pinned.</div>
              ) : (
                <ul className="mt-2 flex flex-col gap-1 max-h-[30vh] overflow-y-auto">
                  {unplaced.map((g) => (
                    <li key={g.id} className="flex items-center justify-between gap-2 py-0.5">
                      <span className="text-[12.5px] text-admin-ink truncate">{g.title}</span>
                      <Button
                        kind={placingId === g.id ? "accent" : "ghost"}
                        size="sm"
                        onClick={() => setPlacingId(placingId === g.id ? null : g.id)}
                      >
                        {placingId === g.id ? "Cancel" : "Place"}
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
              {placingId && (
                <div className="mt-3 text-[11px] text-admin-accent italic">
                  Click the map to drop the pin.
                </div>
              )}
            </Card>
          </aside>

          <div
            ref={vpRef}
            onMouseDown={onCanvasMouseDown}
            onMouseMove={onCanvasMouseMove}
            onMouseUp={onCanvasMouseUp}
            onMouseLeave={onCanvasMouseUp}
            className="relative overflow-hidden rounded-lg border border-admin-border"
            style={{
              background: palette.bg,
              cursor: placingId ? "crosshair" : panDragRef.current ? "grabbing" : "grab",
            }}
          >
            <div
              style={{
                position: "absolute",
                left: 0,
                top: 0,
                width: MAP_W,
                height: MAP_H,
                transform: `translate(${view.x}px, ${view.y}px) scale(${view.s})`,
                transformOrigin: "0 0",
              }}
            >
              <svg width={MAP_W} height={MAP_H} style={{ display: "block" }}>
                <defs>
                  <radialGradient id="fm-admin-ocean" cx="50%" cy="50%" r="60%">
                    <stop offset="0%" stopColor={palette.sphereFill} />
                    <stop offset="100%" stopColor={palette.sphereDeep} />
                  </radialGradient>
                </defs>
                {spherePath && (
                  <path
                    d={spherePath}
                    fill="url(#fm-admin-ocean)"
                    stroke={palette.landStroke}
                    strokeWidth="1"
                    strokeOpacity="0.4"
                  />
                )}
                {graticulePath && (
                  <path
                    d={graticulePath}
                    fill="none"
                    stroke={palette.graticule}
                    strokeWidth="0.5"
                    opacity="0.7"
                  />
                )}
                {worldPath && (
                  <path
                    d={worldPath}
                    fill={palette.landFill}
                    stroke={palette.landStroke}
                    strokeWidth="0.8"
                    strokeLinejoin="round"
                    strokeOpacity="0.7"
                  />
                )}
              </svg>

              {projectedPins.map(({ gallery, px, py }) => {
                const accent = gallery.accentColor ?? PIN_FALLBACK;
                const isSelected = selectedId === gallery.id;
                return (
                  <div
                    key={gallery.id}
                    data-pin={gallery.id}
                    onMouseDown={startPinDrag(gallery)}
                    onClick={() => setSelectedId(gallery.id)}
                    style={{
                      position: "absolute",
                      left: Math.round(px),
                      top: Math.round(py),
                      transform: "translate(-50%, -50%)",
                      cursor: "grab",
                      zIndex: isSelected ? 10 : 3,
                    }}
                  >
                    <div
                      style={{
                        position: "relative",
                        transform: `scale(${1 / view.s})`,
                        transformOrigin: "center center",
                      }}
                    >
                      <div
                        style={{
                          width: 22,
                          height: 22,
                          borderRadius: "50%",
                          background: accent,
                          border: `2px solid ${palette.pinBorder}`,
                          boxShadow: isSelected
                            ? `0 0 0 3px ${accent}55, 0 6px 16px rgba(13,17,22,0.3)`
                            : "0 2px 6px rgba(13,17,22,0.25)",
                        }}
                      />
                      <div
                        style={{
                          position: "absolute",
                          top: 26,
                          left: "50%",
                          transform: "translateX(-50%)",
                          whiteSpace: "nowrap",
                          fontFamily: "ui-sans-serif, system-ui, sans-serif",
                          fontSize: 11,
                          color: palette.ink,
                          background: "rgba(255,255,255,0.9)",
                          padding: "1px 6px",
                          borderRadius: 3,
                          pointerEvents: "none",
                        }}
                      >
                        {gallery.title}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {placingId && (
              <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 bg-admin-surface/95 border border-admin-accent rounded px-3 py-1.5 shadow">
                <Crosshair className="h-3.5 w-3.5 text-admin-accent" />
                <span className="text-[12px] text-admin-ink">
                  Placing <strong>{galleries.find((g) => g.id === placingId)?.title}</strong> — click the map
                </span>
              </div>
            )}

            {loading && (
              <div className="absolute inset-0 grid place-items-center bg-admin-surface/60 text-[12px] text-admin-ink-soft">
                Loading galleries…
              </div>
            )}

            {!loading && galleries.length === 0 && (
              <div className="absolute inset-0 grid place-items-center text-admin-ink-soft text-[13px]">
                <div className="flex flex-col items-center gap-2">
                  <MapPin className="h-6 w-6 opacity-50" />
                  <div>No galleries yet.</div>
                  <Link href="/admin/galleries" className="text-admin-accent underline">
                    Create one
                  </Link>
                </div>
              </div>
            )}

            <div className="absolute bottom-3 right-3 flex gap-2 z-20">
              <Pill tone="neutral">{placed.length} placed</Pill>
              {unplaced.length > 0 && <Pill tone="warn">{unplaced.length} unplaced</Pill>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
