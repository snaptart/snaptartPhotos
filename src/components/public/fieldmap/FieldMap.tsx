"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { geoPath, geoGraticule, geoMercator } from "d3-geo";
import { geoMollweide } from "d3-geo-projection";
import { feature, mesh } from "topojson-client";
import type {
  Topology,
  GeometryCollection,
  GeometryObject,
} from "topojson-specification";
import type { FeatureCollection, MultiPolygon, Polygon } from "geojson";
import type {
  FieldMapProps,
  FieldMapRegion,
  MapStyle,
} from "./types";

const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

type ProjectionKey = "mollweide" | "mercator";

// Mollweide fills a 2:1 ellipse naturally; Mercator gets an asymmetric box
// that trims most of Antarctica on mobile, giving the rest of the world more
// of the phone's viewport.
const MAP_DIMS: Record<ProjectionKey, { w: number; h: number }> = {
  mollweide: { w: 2000, h: 1000 },
  mercator: { w: 1200, h: 900 },
};

// Asymmetric clip: +82° north keeps arctic shots visible; -60° south cuts off
// most of Antarctica (the Antarctic peninsula tip still shows) so the fit
// centers on the inhabited world instead of reserving room for the ice cap.
const MERCATOR_CLIP_NORTH = 82;
const MERCATOR_CLIP_SOUTH = -60;
const MERCATOR_CLIP: Polygon = {
  type: "Polygon",
  coordinates: [[
    [-180, MERCATOR_CLIP_SOUTH],
    [180, MERCATOR_CLIP_SOUTH],
    [180, MERCATOR_CLIP_NORTH],
    [-180, MERCATOR_CLIP_NORTH],
    [-180, MERCATOR_CLIP_SOUTH],
  ]],
};

// Module-level path cache so subsequent FieldMap mounts (navigating between
// / and /map/[slug]) don't flash an empty map while re-fetching the land
// TopoJSON. Cached per projection since the path strings differ.
type CacheEntry = {
  world: string | null;
  countries: string | null;
  states: string | null;
  graticule: string | null;
  sphere: string | null;
};
type FetchEntry = {
  world: Promise<string | null> | null;
  countries: Promise<string | null> | null;
  states: Promise<string | null> | null;
};
const emptyCache = (): CacheEntry => ({
  world: null,
  countries: null,
  states: null,
  graticule: null,
  sphere: null,
});
const emptyFetches = (): FetchEntry => ({
  world: null,
  countries: null,
  states: null,
});
const pathCache: Record<ProjectionKey, CacheEntry> = {
  mollweide: emptyCache(),
  mercator: emptyCache(),
};
const fetchPromises: Record<ProjectionKey, FetchEntry> = {
  mollweide: emptyFetches(),
  mercator: emptyFetches(),
};

type Palette = {
  bg: string;
  sphereFill: string;
  sphereDeep: string;
  landFill: string;
  landStroke: string;
  ink: string;
  graticule: string;
  panelBg: string;
  panelBorder: string;
  pinBorder: string;
  routeLine: string;
};

function paletteFor(style: MapStyle): Palette {
  if (style === "blueprint") {
    return {
      bg: "#0d1a2e",
      sphereFill: "#0f2340",
      sphereDeep: "#0a1628",
      landFill: "#1b3a66",
      landStroke: "#5a86c2",
      ink: "#e6ebf2",
      graticule: "#264a7a",
      panelBg: "rgba(13,26,46,0.9)",
      panelBorder: "#264a7a",
      pinBorder: "#0d1a2e",
      routeLine: "#7aa2d1",
    };
  }
  if (style === "mono") {
    return {
      bg: "#f6f7f8",
      sphereFill: "#eceef1",
      sphereDeep: "#dfe2e7",
      landFill: "#ffffff",
      landStroke: "#c9ced6",
      ink: "#0d1116",
      graticule: "#d6dae0",
      panelBg: "rgba(255,255,255,0.92)",
      panelBorder: "#c9ced6",
      pinBorder: "#ffffff",
      routeLine: "oklch(0.55 0.18 255)",
    };
  }
  return {
    bg: "#ffffff",
    sphereFill: "oklch(0.93 0.04 235)",
    sphereDeep: "oklch(0.88 0.05 230)",
    landFill: "oklch(0.93 0.022 85)",
    landStroke: "oklch(0.72 0.035 75)",
    ink: "#0d1116",
    graticule: "oklch(0.82 0.015 230)",
    panelBg: "rgba(255,255,255,0.92)",
    panelBorder: "#c9ced6",
    pinBorder: "#ffffff",
    routeLine: "oklch(0.55 0.18 255)",
  };
}

export default function FieldMap({
  regions,
  yearBounds,
  filters,
  mapStyle = "modern",
  siteTitle = "Snaptart",
  tagline = "Field Map · Expedition Log",
  mode = "interactive",
  highlightSlug,
  showBrand = false,
  showFilters = false,
  showYearScrubber = false,
  backgroundColor,
}: FieldMapProps) {
  const isBackground = mode === "background";
  const chromeBrand = !isBackground && showBrand;
  const chromeFilters = !isBackground && showFilters;
  const chromeScrubber = !isBackground && showYearScrubber;
  const router = useRouter();
  const [filter, setFilter] = useState<string>("all");
  const [years, setYears] = useState<[number, number]>(yearBounds);
  const [hoverRegion, setHoverRegion] = useState<string | null>(null);
  const [view, setView] = useState({ x: 0, y: 0, s: 1 });
  const [cursor, setCursor] = useState({ x: 0, y: 0, lat: 0, lng: 0 });
  const [isMobile, setIsMobile] = useState(false);
  const projectionKey: ProjectionKey = isMobile ? "mercator" : "mollweide";
  const { w: MAP_W, h: MAP_H } = MAP_DIMS[projectionKey];
  const [worldPath, setWorldPath] = useState<string | null>(pathCache[projectionKey].world);
  const [countriesPath, setCountriesPath] = useState<string | null>(pathCache[projectionKey].countries);
  const [statesPath, setStatesPath] = useState<string | null>(pathCache[projectionKey].states);
  const [graticulePath, setGraticulePath] = useState<string | null>(pathCache[projectionKey].graticule);
  const [spherePath, setSpherePath] = useState<string | null>(pathCache[projectionKey].sphere);

  const vpRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<{ x: number; y: number; vx: number; vy: number } | null>(null);
  const pointersRef = useRef<Map<number, { x: number; y: number }>>(new Map());
  const pinchRef = useRef<{
    id1: number;
    id2: number;
    d0: number;
    mx0: number;
    my0: number;
    vx0: number;
    vy0: number;
    vs0: number;
  } | null>(null);
  const hoverCloseRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const openHover = useCallback((id: string) => {
    if (hoverCloseRef.current) {
      clearTimeout(hoverCloseRef.current);
      hoverCloseRef.current = null;
    }
    setHoverRegion(id);
  }, []);
  const scheduleCloseHover = useCallback(() => {
    if (hoverCloseRef.current) clearTimeout(hoverCloseRef.current);
    hoverCloseRef.current = setTimeout(() => {
      setHoverRegion(null);
      hoverCloseRef.current = null;
    }, 180);
  }, []);
  const projection = useMemo(() => {
    if (projectionKey === "mercator") {
      return geoMercator()
        .precision(0.3)
        .fitExtent([[0, 0], [MAP_W, MAP_H]], MERCATOR_CLIP);
    }
    return geoMollweide()
      .scale((MAP_W / (2 * Math.PI)) * 1.05)
      .translate([MAP_W / 2, MAP_H / 2])
      .precision(0.3);
  }, [projectionKey, MAP_W, MAP_H]);

  // Track viewport width to swap projection on mobile. useLayoutEffect so the
  // mobile branch is picked before the first path-building effect runs.
  useIsomorphicLayoutEffect(() => {
    if (typeof window === "undefined") return;
    const mql = window.matchMedia("(max-width: 900px)");
    setIsMobile(mql.matches);
    const onChange = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  const palette = paletteFor(mapStyle);

  // Build graticule + sphere + world paths. Graticule and sphere are
  // synchronous; world land is fetched once and cached at module level per
  // projection (the path strings differ, so each projection gets its own
  // cache entry).
  useEffect(() => {
    const path = geoPath(projection);
    const cache = pathCache[projectionKey];
    const fetches = fetchPromises[projectionKey];

    if (!cache.graticule) {
      cache.graticule = path(geoGraticule().step([20, 15])()) ?? null;
    }
    if (!cache.sphere) {
      cache.sphere = path({ type: "Sphere" }) ?? null;
    }
    setGraticulePath(cache.graticule);
    setSpherePath(cache.sphere);
    // Reset async paths to whatever this projection has cached (may be null
    // on first visit to that projection) so we don't show the previous
    // projection's land outline misaligned with the new pin positions.
    setWorldPath(cache.world);
    setCountriesPath(cache.countries);
    setStatesPath(cache.states);

    let cancelled = false;

    if (!cache.world) {
      if (!fetches.world) {
        fetches.world = fetch("/data/land-110m.json")
          .then((r) => r.json() as Promise<Topology>)
          .then((topo) => {
            const land = feature(
              topo,
              topo.objects.land as GeometryCollection | GeometryObject
            ) as unknown as FeatureCollection<Polygon | MultiPolygon>;
            cache.world = path(land) ?? null;
            return cache.world;
          })
          .catch(() => null);
      }
      fetches.world.then((p) => {
        if (!cancelled) setWorldPath(p);
      });
    }

    if (!cache.countries) {
      if (!fetches.countries) {
        fetches.countries = fetch("/data/countries-110m.json")
          .then((r) => r.json() as Promise<Topology>)
          .then((topo) => {
            const borders = mesh(
              topo,
              topo.objects.countries as GeometryCollection | GeometryObject,
              (a, b) => a !== b,
            );
            cache.countries = path(borders) ?? null;
            return cache.countries;
          })
          .catch(() => null);
      }
      fetches.countries.then((p) => {
        if (!cancelled) setCountriesPath(p);
      });
    }

    if (!cache.states) {
      if (!fetches.states) {
        fetches.states = fetch("/data/states-10m.json")
          .then((r) => r.json() as Promise<Topology>)
          .then((topo) => {
            const borders = mesh(
              topo,
              topo.objects.states as GeometryCollection | GeometryObject,
              (a, b) => a !== b,
            );
            cache.states = path(borders) ?? null;
            return cache.states;
          })
          .catch(() => null);
      }
      fetches.states.then((p) => {
        if (!cancelled) setStatesPath(p);
      });
    }

    return () => {
      cancelled = true;
    };
  }, [projection, projectionKey]);

  // Restore persisted view state. Clamp years to current yearBounds so an old
  // saved range from before new photos were added can't shrink the visible
  // set and hide pins. yearBounds is read via ref so deps stay [] (length must
  // be stable across HMR).
  const yearBoundsRef = useRef(yearBounds);
  yearBoundsRef.current = yearBounds;
  useEffect(() => {
    try {
      const saved = localStorage.getItem("snaptart-fm-view");
      if (saved) {
        const s = JSON.parse(saved) as { filter?: string; years?: [number, number] };
        if (s.filter) setFilter(s.filter);
        if (s.years) {
          const [lo, hi] = yearBoundsRef.current;
          setYears([Math.max(s.years[0], lo), Math.min(s.years[1], hi)]);
        }
      }
    } catch {}
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem("snaptart-fm-view", JSON.stringify({ filter, years }));
    } catch {}
  }, [filter, years]);

  // Fit to viewport — also exposed as resetView so a button can recenter.
  const resetView = useCallback(() => {
    const vp = vpRef.current;
    if (!vp) return;
    const r = vp.getBoundingClientRect();
    // Mobile fits to width (no left/right gap regardless of orientation) and
    // sits a bit higher; desktop uses min-fit so both dimensions show.
    const padX = isMobile ? 0 : 60;
    const padY = isMobile ? 120 : 160;
    const yOffset = isMobile ? -60 : -20;
    const widthFit = (r.width - padX) / MAP_W;
    const heightFit = (r.height - padY) / MAP_H;
    const s = isMobile ? widthFit : Math.min(widthFit, heightFit);
    setView({ s, x: (r.width - MAP_W * s) / 2, y: (r.height - MAP_H * s) / 2 + yOffset });
  }, [MAP_W, MAP_H, isMobile]);

  // useLayoutEffect so the correct view is set before the first paint,
  // preventing a flash of the unfitted map at view={0,0,1}.
  useIsomorphicLayoutEffect(() => {
    resetView();
    window.addEventListener("resize", resetView);
    return () => window.removeEventListener("resize", resetView);
  }, [resetView]);

  // Enforce "no horizontal gap on mobile": scale can't drop below what's
  // needed to cover the viewport width, and horizontal pan can't move a
  // map edge inside the viewport.
  const clampScale = useCallback((s: number) => {
    const vp = vpRef.current;
    const minS = vp && isMobile ? vp.getBoundingClientRect().width / MAP_W : 0.4;
    return Math.min(4, Math.max(minS, s));
  }, [isMobile, MAP_W]);

  const clampView = useCallback((v: { x: number; y: number; s: number }) => {
    const vp = vpRef.current;
    if (!vp) return v;
    const r = vp.getBoundingClientRect();
    const s = clampScale(v.s);
    let x = v.x;
    if (isMobile) {
      const mapW = MAP_W * s;
      x = Math.min(0, Math.max(r.width - mapW, v.x));
    }
    return { s, x, y: v.y };
  }, [clampScale, isMobile, MAP_W]);

  // Wheel pan + zoom
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
          const ns = clampScale(v.s * f);
          const k = ns / v.s;
          return clampView({ s: ns, x: cx - (cx - v.x) * k, y: cy - (cy - v.y) * k });
        });
      } else {
        setView((v) => clampView({ ...v, x: v.x - e.deltaX, y: v.y - e.deltaY }));
      }
    };
    vp.addEventListener("wheel", onWheel, { passive: false });
    return () => vp.removeEventListener("wheel", onWheel);
  }, [clampScale, clampView]);

  const onDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest("[data-region]")) return;
    // Capture the pointer so we keep getting move/up events even if the
    // finger slides off the viewport (touch dragging the map off-screen).
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pointersRef.current.size >= 2 && !pinchRef.current) {
      // Second finger landed — start pinch and cancel any single-finger drag.
      const vp = vpRef.current;
      if (!vp) return;
      const r = vp.getBoundingClientRect();
      const entries = Array.from(pointersRef.current.entries()).slice(0, 2);
      const [id1, p1] = entries[0];
      const [id2, p2] = entries[1];
      pinchRef.current = {
        id1,
        id2,
        d0: Math.hypot(p1.x - p2.x, p1.y - p2.y) || 1,
        mx0: (p1.x + p2.x) / 2 - r.left,
        my0: (p1.y + p2.y) / 2 - r.top,
        vx0: view.x,
        vy0: view.y,
        vs0: view.s,
      };
      dragRef.current = null;
    } else if (pointersRef.current.size === 1) {
      dragRef.current = { x: e.clientX, y: e.clientY, vx: view.x, vy: view.y };
    }
  };

  const onMove = (e: React.PointerEvent) => {
    const vp = vpRef.current;
    if (!vp) return;
    const r = vp.getBoundingClientRect();
    if (pointersRef.current.has(e.pointerId)) {
      pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    }
    const sx = (e.clientX - r.left - view.x) / view.s;
    const sy = (e.clientY - r.top - view.y) / view.s;
    let lat = 0;
    let lng = 0;
    if (projection.invert) {
      const inv = projection.invert([sx, sy]);
      if (inv) {
        lng = inv[0];
        lat = inv[1];
      }
    }
    setCursor({ x: e.clientX - r.left, y: e.clientY - r.top, lat, lng });

    // Pinch takes priority: scale around the initial midpoint, then translate
    // by the midpoint delta so the gesture follows the fingers.
    const pinch = pinchRef.current;
    if (pinch) {
      const p1 = pointersRef.current.get(pinch.id1);
      const p2 = pointersRef.current.get(pinch.id2);
      if (p1 && p2) {
        const d = Math.hypot(p1.x - p2.x, p1.y - p2.y);
        const mx = (p1.x + p2.x) / 2 - r.left;
        const my = (p1.y + p2.y) / 2 - r.top;
        const ns = clampScale(pinch.vs0 * (d / pinch.d0));
        const k = ns / pinch.vs0;
        const x = pinch.mx0 - (pinch.mx0 - pinch.vx0) * k + (mx - pinch.mx0);
        const y = pinch.my0 - (pinch.my0 - pinch.vy0) * k + (my - pinch.my0);
        setView(clampView({ s: ns, x, y }));
      }
      return;
    }

    const drag = dragRef.current;
    if (!drag) return;
    // Mobile: lock vertical drag — only horizontal pan with one finger.
    // Pinch (two fingers) still freely adjusts y to anchor on the midpoint.
    setView((v) => clampView({
      ...v,
      x: drag.vx + (e.clientX - drag.x),
      y: isMobile ? v.y : drag.vy + (e.clientY - drag.y),
    }));
  };

  const onUp = (e: React.PointerEvent) => {
    if ((e.currentTarget as HTMLElement).hasPointerCapture(e.pointerId)) {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    }
    pointersRef.current.delete(e.pointerId);
    if (
      pinchRef.current &&
      (pinchRef.current.id1 === e.pointerId || pinchRef.current.id2 === e.pointerId)
    ) {
      pinchRef.current = null;
    }
    if (pointersRef.current.size === 0) {
      dragRef.current = null;
    } else if (pointersRef.current.size === 1 && !pinchRef.current) {
      // Hand off to single-finger pan with the remaining pointer so the user
      // can keep dragging after lifting one finger from a pinch.
      const remaining = Array.from(pointersRef.current.values())[0];
      dragRef.current = {
        x: remaining.x,
        y: remaining.y,
        vx: view.x,
        vy: view.y,
      };
    }
  };

  // Project regions
  const projectedRegions = useMemo(() => {
    return regions.map((r) => {
      const p = projection([r.longitude, r.latitude]) ?? [0, 0];
      // Round to integer pixels so the server- and client-serialized style
      // strings match (the browser rounds inline-style pixel values when
      // read back during hydration; full-float positions cause a React
      // hydration mismatch).
      return { ...r, px: Math.round(p[0]), py: Math.round(p[1]) };
    });
  }, [regions, projection]);

  const activeFilter = filters.find((f) => f.id === filter);
  const activeTag = activeFilter?.tag ?? null;

  // Live-count visible photos per region based on filter + year range
  const visibleRegions = useMemo(() => {
    return projectedRegions.map((r) => {
      const visibleCount = r.photosByYearTag.reduce((n, p) => {
        if (p.year < years[0] || p.year > years[1]) return n;
        if (activeTag && p.tag !== activeTag) return n;
        return n + 1;
      }, 0);
      return { ...r, visibleCount };
    });
  }, [projectedRegions, years, activeTag]);

  const zoomBy = useCallback((factor: number) => {
    const vp = vpRef.current;
    if (!vp) return;
    const r = vp.getBoundingClientRect();
    const cx = r.width / 2;
    const cy = r.height / 2;
    setView((v) => {
      const ns = clampScale(v.s * factor);
      const k = ns / v.s;
      return clampView({ s: ns, x: cx - (cx - v.x) * k, y: cy - (cy - v.y) * k });
    });
  }, [clampScale, clampView]);

  return (
    <div
      ref={vpRef}
      onPointerDown={isBackground ? undefined : onDown}
      onPointerMove={isBackground ? undefined : onMove}
      onPointerUp={isBackground ? undefined : onUp}
      onPointerCancel={isBackground ? undefined : onUp}
      style={{
        position: "absolute",
        inset: 0,
        overflow: "hidden",
        cursor: isBackground ? "default" : dragRef.current ? "grabbing" : "grab",
        background: backgroundColor ?? palette.bg,
        userSelect: "none",
        pointerEvents: isBackground ? "none" : undefined,
        // Stop the browser from using touch gestures for page scroll/zoom so
        // pointer events fire for drag on mobile.
        touchAction: isBackground ? undefined : "none",
      }}
    >
      {mapStyle === "blueprint" && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            opacity: 0.3,
            backgroundImage:
              "repeating-linear-gradient(0deg, rgba(255,255,255,0.04) 0 1px, transparent 1px 32px), repeating-linear-gradient(90deg, rgba(255,255,255,0.04) 0 1px, transparent 1px 32px)",
          }}
        />
      )}

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
            <radialGradient id="fm-ocean" cx="50%" cy="50%" r="60%">
              <stop offset="0%" stopColor={palette.sphereFill} />
              <stop offset="100%" stopColor={palette.sphereDeep} />
            </radialGradient>
          </defs>

          {spherePath && (
            <path
              d={spherePath}
              fill="url(#fm-ocean)"
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

          {countriesPath && (
            <path
              d={countriesPath}
              fill="none"
              stroke={palette.landStroke}
              strokeWidth="0.5"
              strokeLinejoin="round"
              strokeLinecap="round"
              strokeOpacity="0.4"
            />
          )}

          {statesPath && (
            <path
              d={statesPath}
              fill="none"
              stroke={palette.landStroke}
              strokeWidth="0.4"
              strokeLinejoin="round"
              strokeLinecap="round"
              strokeOpacity="0.28"
            />
          )}
        </svg>

        {visibleRegions.map((r) => {
          if (r.visibleCount === 0) return null;
          const size = Math.max(22, Math.min(72, 18 + Math.sqrt(r.visibleCount) * 5));
          const isHover = hoverRegion === r.id;
          const isHighlight = isBackground && highlightSlug === r.slug;
          const labelLeft = r.px > MAP_W - 160;
          const coords = `${Math.abs(r.latitude).toFixed(2)}°${r.latitude >= 0 ? "N" : "S"} ${Math.abs(r.longitude).toFixed(2)}°${r.longitude >= 0 ? "E" : "W"}`;

          const handlePinClick = (e: React.MouseEvent) => {
            if (isBackground) return;
            try {
              sessionStorage.setItem(
                `fieldmap-origin-${r.slug}`,
                JSON.stringify({ x: e.clientX, y: e.clientY })
              );
            } catch {}
            router.push(`/map/${r.slug}`);
          };

          return (
            <div
              key={r.id}
              data-region={r.id}
              onClick={handlePinClick}
              onMouseEnter={() => !isBackground && openHover(r.id)}
              onMouseLeave={() => !isBackground && scheduleCloseHover()}
              style={{
                position: "absolute",
                left: r.px,
                top: r.py,
                transform: "translate(-50%, -50%)",
                cursor: "pointer",
                zIndex: isHover ? 5 : 2,
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
                  position: "absolute",
                  left: "50%",
                  top: "50%",
                  width: size + (isHighlight ? 32 : 18),
                  height: size + (isHighlight ? 32 : 18),
                  borderRadius: "50%",
                  transform: "translate(-50%, -50%)",
                  border: `${isHighlight ? 2 : 1}px solid ${r.accentColor}`,
                  opacity: isHighlight ? 0.9 : isHover ? 0.6 : 0.2,
                  transition: "opacity 0.2s",
                }}
              />
              <div
                style={{
                  position: "relative",
                  width: size,
                  height: size,
                  borderRadius: "50%",
                  background: r.accentColor,
                  color: "#fff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontFamily: "'Inter', system-ui, sans-serif",
                  fontSize: size > 40 ? 14 : 12,
                  fontWeight: 600,
                  border: `2px solid ${palette.pinBorder}`,
                  boxShadow: isHover
                    ? `0 8px 24px ${r.accentColor}66, 0 2px 4px rgba(13,17,22,0.1)`
                    : "0 2px 6px rgba(13,17,22,0.12)",
                  transition: "box-shadow 0.2s, transform 0.2s",
                  transform: isHover ? "scale(1.08)" : "scale(1)",
                }}
              >
                {r.visibleCount}
              </div>
              <div
                style={{
                  position: "absolute",
                  top: size + 6,
                  left: "50%",
                  transform: "translateX(-50%)",
                  whiteSpace: "nowrap",
                  fontFamily: "'Instrument Serif', serif",
                  fontStyle: "italic",
                  fontSize: 17,
                  color: palette.ink,
                  letterSpacing: -0.1,
                  textShadow:
                    mapStyle === "blueprint"
                      ? "0 0 8px #0d1a2e"
                      : "0 0 8px rgba(255,255,255,0.9)",
                }}
              >
                {r.name}
              </div>
              {isHover && (
                <div
                  onMouseEnter={() => openHover(r.id)}
                  onMouseLeave={scheduleCloseHover}
                  style={{
                    position: "absolute",
                    bottom: "calc(100% + 10px)",
                    left: labelLeft ? "auto" : "50%",
                    right: labelLeft ? "50%" : "auto",
                    transform: labelLeft ? "translateX(0)" : "translateX(-50%)",
                    width: 230,
                    background: mapStyle === "blueprint" ? "#0f2340" : "#ffffff",
                    border: `1px solid ${
                      mapStyle === "blueprint" ? r.accentColor : palette.panelBorder
                    }`,
                    borderRadius: 10,
                    padding: 12,
                    boxShadow:
                      "0 16px 40px rgba(13,17,22,0.14), 0 2px 8px rgba(13,17,22,0.06)",
                  }}
                >
                  {r.previewThumbs.length > 0 && (
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(3, 1fr)",
                        gap: 4,
                        marginBottom: 10,
                      }}
                    >
                      {r.previewThumbs.slice(0, 6).map((src, i) => (
                        <img
                          key={i}
                          src={src}
                          alt=""
                          style={{
                            width: "100%",
                            aspectRatio: "1",
                            objectFit: "cover",
                            display: "block",
                            borderRadius: 4,
                          }}
                        />
                      ))}
                    </div>
                  )}
                  <div
                    style={{
                      fontFamily: "'Instrument Serif', serif",
                      fontStyle: "italic",
                      fontSize: 18,
                      color: palette.ink,
                      marginBottom: 4,
                      letterSpacing: -0.2,
                    }}
                  >
                    {r.name}
                  </div>
                  <div
                    style={{
                      fontFamily: "'IBM Plex Mono', monospace",
                      fontSize: 9,
                      letterSpacing: 0.5,
                      color: r.accentColor,
                      marginBottom: 6,
                      fontWeight: 500,
                    }}
                  >
                    {coords} · {r.yearRange[0]}–{r.yearRange[1]}
                  </div>
                  {r.flavor && (
                    <div
                      style={{
                        fontFamily: "'Instrument Serif', serif",
                        fontSize: 13,
                        color: palette.ink,
                        opacity: 0.75,
                        fontStyle: "italic",
                      }}
                    >
                      &ldquo;{r.flavor}&rdquo;
                    </div>
                  )}
                </div>
              )}
              </div>
            </div>
          );
        })}
      </div>

      {chromeBrand && (
      /* TOP LEFT: brand */
      <div style={{ position: "absolute", top: 22, left: 24, zIndex: 10, color: palette.ink }}>
        <div
          style={{
            fontFamily: "'Instrument Serif', serif",
            fontSize: 26,
            fontStyle: "italic",
            letterSpacing: -0.5,
            lineHeight: 1,
          }}
        >
          {siteTitle}
        </div>
        <div
          style={{
            fontFamily: "'Inter', system-ui, sans-serif",
            fontSize: 10,
            letterSpacing: 1.5,
            opacity: 0.55,
            marginTop: 6,
            fontWeight: 500,
            textTransform: "uppercase",
          }}
        >
          {tagline}
        </div>
      </div>
      )}

      {!isBackground && (
      /* BOTTOM LEFT: cursor readout */
      <div
        style={{
          position: "absolute",
          bottom: 88,
          left: 24,
          zIndex: 10,
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: 10,
          color: palette.ink,
          opacity: 0.65,
          letterSpacing: 0.3,
          pointerEvents: "none",
        }}
      >
        <div>
          {cursor.lat >= -90 && cursor.lat <= 90
            ? `${Math.abs(cursor.lat).toFixed(3)}° ${cursor.lat >= 0 ? "N" : "S"}  ${Math.abs(cursor.lng).toFixed(3)}° ${cursor.lng >= 0 ? "E" : "W"}`
            : "— · —"}
        </div>
        <div>ZOOM ×{view.s.toFixed(2)}</div>
      </div>
      )}

      {chromeFilters && (
      /* TOP CENTER: filter chips */
      <div
        style={{
          position: "absolute",
          top: 22,
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 10,
          display: "flex",
          gap: 4,
          background: palette.panelBg,
          backdropFilter: "blur(10px)",
          border: `1px solid ${palette.panelBorder}`,
          padding: 4,
          borderRadius: 10,
          boxShadow: "0 2px 10px rgba(13,17,22,0.05)",
        }}
      >
        {filters.map((f) => {
          const active = filter === f.id;
          return (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              style={{
                padding: "7px 14px",
                fontFamily: "'Inter', system-ui, sans-serif",
                fontSize: 11,
                letterSpacing: 0.2,
                fontWeight: 500,
                background: active
                  ? mapStyle === "blueprint"
                    ? "#e6ebf2"
                    : "#0d1116"
                  : "transparent",
                color: active
                  ? mapStyle === "blueprint"
                    ? "#0d1a2e"
                    : "#ffffff"
                  : palette.ink,
                border: "none",
                cursor: "pointer",
                borderRadius: 7,
              }}
            >
              {f.label}
            </button>
          );
        })}
      </div>
      )}

      {chromeScrubber && (
        <YearScrubber
          years={years}
          setYears={setYears}
          bounds={yearBounds}
          regions={visibleRegions}
          palette={palette}
          mapStyle={mapStyle}
        />
      )}

      {!isBackground && (
      /* BOTTOM RIGHT: zoom controls */
      <div
        style={{
          position: "absolute",
          bottom: 88,
          right: 24,
          zIndex: 10,
          display: "flex",
          flexDirection: "column",
          border: `1px solid ${palette.panelBorder}`,
          background: palette.panelBg,
          borderRadius: 8,
          overflow: "hidden",
          boxShadow: "0 2px 10px rgba(13,17,22,0.05)",
        }}
      >
        {(
          [
            ["+", 1.3],
            ["−", 1 / 1.3],
          ] as const
        ).map(([l, f]) => (
          <button
            key={l}
            onClick={() => zoomBy(f)}
            style={{
              width: 34,
              height: 34,
              background: "transparent",
              border: "none",
              borderBottom: `1px solid ${palette.panelBorder}`,
              color: palette.ink,
              cursor: "pointer",
              fontFamily: "'Inter', system-ui, sans-serif",
              fontSize: 16,
              fontWeight: 400,
            }}
          >
            {l}
          </button>
        ))}
        <button
          onClick={resetView}
          aria-label="Reset map position"
          title="Reset map position"
          style={{
            width: 34,
            height: 34,
            background: "transparent",
            border: "none",
            color: palette.ink,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <circle cx="8" cy="8" r="2" />
            <path d="M8 1v2.2M8 12.8V15M1 8h2.2M12.8 8H15" />
          </svg>
        </button>
      </div>
      )}
    </div>
  );
}

type YearScrubberProps = {
  years: [number, number];
  setYears: (fn: (old: [number, number]) => [number, number]) => void;
  bounds: [number, number];
  regions: Array<FieldMapRegion & { visibleCount: number }>;
  palette: Palette;
  mapStyle: MapStyle;
};

function YearScrubber({ years, setYears, bounds, regions, palette, mapStyle }: YearScrubberProps) {
  const [Y0, Y1] = bounds;
  const trackRef = useRef<HTMLDivElement | null>(null);
  const pctForYear = (y: number) => (Y1 === Y0 ? 0 : (y - Y0) / (Y1 - Y0));
  const yearForPct = (p: number) => Math.round(Y0 + p * (Y1 - Y0));

  const densityByYear = useMemo(() => {
    const m: Record<number, number> = {};
    for (let y = Y0; y <= Y1; y++) m[y] = 0;
    for (const r of regions) {
      for (const p of r.photosByYearTag) {
        if (p.year >= Y0 && p.year <= Y1) m[p.year] = (m[p.year] ?? 0) + 1;
      }
    }
    return m;
  }, [regions, Y0, Y1]);

  const maxDensity = Math.max(1, ...Object.values(densityByYear));
  const accent = "oklch(0.55 0.18 255)";

  const startDrag = (which: "left" | "right") => (e: React.MouseEvent) => {
    e.stopPropagation();
    const onMove = (ev: MouseEvent) => {
      const track = trackRef.current;
      if (!track) return;
      const r = track.getBoundingClientRect();
      const p = Math.max(0, Math.min(1, (ev.clientX - r.left) / r.width));
      const y = yearForPct(p);
      setYears((old) =>
        which === "left" ? [Math.min(y, old[1]), old[1]] : [old[0], Math.max(y, old[0])]
      );
    };
    const onUp = () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  const ticks: number[] = [];
  const step = Math.max(1, Math.round((Y1 - Y0) / 4));
  for (let y = Y0; y <= Y1; y += step) ticks.push(y);
  if (ticks[ticks.length - 1] !== Y1) ticks.push(Y1);

  return (
    <div
      style={{
        position: "absolute",
        bottom: 24,
        left: 80,
        right: 80,
        zIndex: 10,
        background: palette.panelBg,
        backdropFilter: "blur(10px)",
        border: `1px solid ${palette.panelBorder}`,
        borderRadius: 10,
        padding: "10px 24px",
        display: "flex",
        alignItems: "center",
        gap: 20,
        boxShadow: "0 2px 10px rgba(13,17,22,0.05)",
      }}
    >
      <div
        style={{
          fontFamily: "'Inter', system-ui, sans-serif",
          fontSize: 10,
          letterSpacing: 0.8,
          color: palette.ink,
          opacity: 0.6,
          whiteSpace: "nowrap",
          fontWeight: 500,
          textTransform: "uppercase",
        }}
      >
        When
      </div>
      <div style={{ flex: 1, position: "relative", height: 46 }} ref={trackRef}>
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: 0,
            height: 20,
            display: "flex",
            alignItems: "flex-end",
            gap: 2,
          }}
        >
          {Object.entries(densityByYear).map(([y, d]) => {
            const inRange = +y >= years[0] && +y <= years[1];
            return (
              <div
                key={y}
                style={{
                  flex: 1,
                  height: `${(d / maxDensity) * 100}%`,
                  background: inRange ? accent : palette.landStroke,
                  opacity: inRange ? 0.85 : 0.3,
                  minHeight: 2,
                  transition: "opacity 0.2s",
                }}
              />
            );
          })}
        </div>
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: 28,
            height: 2,
            background: palette.landStroke,
            opacity: 0.4,
          }}
        />
        <div
          style={{
            position: "absolute",
            top: 27,
            left: `${pctForYear(years[0]) * 100}%`,
            width: `${(pctForYear(years[1]) - pctForYear(years[0])) * 100}%`,
            height: 4,
            background: accent,
          }}
        />
        {(["left", "right"] as const).map((which) => {
          const y = which === "left" ? years[0] : years[1];
          return (
            <div
              key={which}
              onMouseDown={startDrag(which)}
              style={{
                position: "absolute",
                top: 22,
                left: `${pctForYear(y) * 100}%`,
                transform: "translateX(-50%)",
                width: 14,
                height: 14,
                background: accent,
                border: "2px solid #fff",
                borderRadius: "50%",
                cursor: "ew-resize",
                boxShadow: "0 2px 6px rgba(13,17,22,0.25)",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  top: 18,
                  left: "50%",
                  transform: "translateX(-50%)",
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: 10,
                  color: palette.ink,
                  background: mapStyle === "blueprint" ? "#0f2340" : "#ffffff",
                  padding: "2px 6px",
                  border: `1px solid ${palette.panelBorder}`,
                  borderRadius: 4,
                }}
              >
                {y}
              </div>
            </div>
          );
        })}
        <div
          style={{
            position: "absolute",
            top: 2,
            left: 0,
            right: 0,
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: 9,
            color: palette.ink,
            opacity: 0.45,
          }}
        >
          {ticks.map((y) => (
            <div
              key={y}
              style={{
                position: "absolute",
                left: `${pctForYear(y) * 100}%`,
                transform: "translateX(-50%)",
              }}
            >
              {y}
            </div>
          ))}
        </div>
      </div>
      <div
        style={{
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: 11,
          color: accent,
          whiteSpace: "nowrap",
          fontWeight: 500,
        }}
      >
        {years[0]} — {years[1]}
      </div>
    </div>
  );
}
