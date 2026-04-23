import { geoPath, geoGraticule } from "d3-geo";
import { geoMollweide } from "d3-geo-projection";
import { feature, mesh } from "topojson-client";
import type { Topology, GeometryCollection, GeometryObject } from "topojson-specification";
import type { FeatureCollection, MultiPolygon, Polygon } from "geojson";

export const MAP_W = 2000;
export const MAP_H = 1000;

export function createMollweideProjection() {
  return geoMollweide()
    .scale((MAP_W / (2 * Math.PI)) * 1.05)
    .translate([MAP_W / 2, MAP_H / 2])
    .precision(0.3);
}

export type MapStyle = "modern" | "mono" | "blueprint";

export type Palette = {
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

export function paletteFor(style: MapStyle): Palette {
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

export async function loadLandPath(
  projection: ReturnType<typeof createMollweideProjection>
): Promise<string | null> {
  const path = geoPath(projection);
  try {
    const res = await fetch("/data/land-110m.json");
    const topo = (await res.json()) as Topology;
    const land = feature(
      topo,
      topo.objects.land as GeometryCollection | GeometryObject
    ) as unknown as FeatureCollection<Polygon | MultiPolygon>;
    return path(land) ?? null;
  } catch {
    return null;
  }
}

export async function loadCountriesBordersPath(
  projection: ReturnType<typeof createMollweideProjection>
): Promise<string | null> {
  const path = geoPath(projection);
  try {
    const res = await fetch("/data/countries-110m.json");
    const topo = (await res.json()) as Topology;
    const borders = mesh(
      topo,
      topo.objects.countries as GeometryCollection | GeometryObject,
      (a, b) => a !== b,
    );
    return path(borders) ?? null;
  } catch {
    return null;
  }
}

export async function loadStatesBordersPath(
  projection: ReturnType<typeof createMollweideProjection>
): Promise<string | null> {
  const path = geoPath(projection);
  try {
    const res = await fetch("/data/states-10m.json");
    const topo = (await res.json()) as Topology;
    const borders = mesh(
      topo,
      topo.objects.states as GeometryCollection | GeometryObject,
      (a, b) => a !== b,
    );
    return path(borders) ?? null;
  } catch {
    return null;
  }
}

export function buildGraticulePath(
  projection: ReturnType<typeof createMollweideProjection>
): string | null {
  return geoPath(projection)(geoGraticule().step([20, 15])()) ?? null;
}

export function buildSpherePath(
  projection: ReturnType<typeof createMollweideProjection>
): string | null {
  return geoPath(projection)({ type: "Sphere" }) ?? null;
}

/**
 * Projects a lat/lng to screen coordinates assuming the map is fit to the
 * given viewport using the same math as FieldMap.tsx (width - 60, height -
 * 160, with a -20px vertical offset). Returns null if the projection fails
 * or the viewport is empty.
 */
export function projectLatLngToScreen(
  latitude: number,
  longitude: number,
  viewportWidth: number,
  viewportHeight: number
): { x: number; y: number } | null {
  if (viewportWidth <= 0 || viewportHeight <= 0) return null;
  const projection = createMollweideProjection();
  const p = projection([longitude, latitude]);
  if (!p) return null;
  const s = Math.min((viewportWidth - 60) / MAP_W, (viewportHeight - 160) / MAP_H);
  const offsetX = (viewportWidth - MAP_W * s) / 2;
  const offsetY = (viewportHeight - MAP_H * s) / 2 - 20;
  return { x: offsetX + p[0] * s, y: offsetY + p[1] * s };
}
