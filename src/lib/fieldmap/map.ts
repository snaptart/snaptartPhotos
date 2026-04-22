import { geoPath, geoGraticule } from "d3-geo";
import { geoMollweide } from "d3-geo-projection";
import { feature } from "topojson-client";
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
