import { geoBounds, geoMercator, geoPath, type GeoProjection } from 'd3-geo';
import type { Feature, FeatureCollection, Geometry } from 'geojson';

import divisionsData from '../data/divisions.json';
import landData from '../data/land.json';
import riversData from '../data/rivers.json';
import { EUROPE_BOX, FIT_BOX, HERO_COUNTRIES, LEG_BOWS, PLACES } from '../data/places';

type Pt = [number, number];

/** One leg of the journey: a quadratic curve a → b with control point c, in k = 1 px. */
export type Leg = { a: Pt; c: Pt; b: Pt; /** route length before this leg */ start: number; length: number };

export function legPoint({ a, c, b }: { a: Pt; c: Pt; b: Pt }, t: number): Pt {
  const u = 1 - t;
  return [u * u * a[0] + 2 * u * t * c[0] + t * t * b[0], u * u * a[1] + 2 * u * t * c[1] + t * t * b[1]];
}

/** SVG path of the first `t` (0–1) of a leg's curve (de Casteljau split). */
export function legPath(leg: Leg, t: number) {
  const { a, c } = leg;
  const p1 = [a[0] + (c[0] - a[0]) * t, a[1] + (c[1] - a[1]) * t];
  const p2 = legPoint(leg, t);
  return `M${a[0]},${a[1]}Q${p1[0]},${p1[1]} ${p2[0]},${p2[1]}`;
}

type CountryFeature = Feature<Geometry, { name: string }>;

export const LAND = (landData as FeatureCollection<Geometry, { name: string }>).features as CountryFeature[];

/** Internal borders of France and Italy, as [lon, lat] polylines. */
const DIVISIONS = divisionsData as unknown as { region: [number, number][][]; local: [number, number][][] };

/** The Rhône (Geneva to the sea) and the Saône, as [lon, lat] polylines. */
const RIVERS = riversData as unknown as { rhone: [number, number][][]; saone: [number, number][][] };

/** Countries within this many degrees of the itinerary box get the ink-blot filter on web. */
const NEAR_DEG = 6;
const [[FW, FS], , [FE, FN]] = FIT_BOX;
const NEAR = new Set(LAND.filter((f) => {
  const [[w, s], [e, n]] = geoBounds(f);
  return w < FE + NEAR_DEG && e > FW - NEAR_DEG && s < FN + NEAR_DEG && n > FS - NEAR_DEG;
}).map((f) => f.properties.name));

export type Chart = {
  projection: GeoProjection;
  /** Country outlines in fitted (k = 1) screen space. */
  land: { name: string; d: string; hero: boolean; near: boolean }[];
  legs: Leg[];
  /** Whole route length, k = 1 px. */
  routeLength: number;
  /** Région / département (regione / provincia) borders, and the hero outline to clip them to. */
  divisions: { region: string; local: string; clip: string };
  /** Rhône and Saône centrelines. */
  rivers: string;
  /** Screen px per 100 km at 44.8° N, at k = 1. */
  kmPer100: number;
  /** Smallest zoom: the scale at which EUROPE_BOX fits the frame. */
  kMin: number;
};

/** Mercator fitted to the itinerary box, padded [[14,26],[W-14,H-40]]. */
export function buildChart(W: number, H: number, wobble?: (x: number, y: number) => [number, number]): Chart {
  const projection = geoMercator().fitExtent(
    [[14, 26], [W - 14, H - 40]],
    { type: 'MultiPoint', coordinates: FIT_BOX },
  );

  // Native has no feDisplacementMap; there the ink wobble is baked into the
  // projected vertices instead (same effect: borders drift a pixel or two).
  const drawProjection: GeoProjection = wobble
    ? Object.assign(Object.create(projection), {
        stream: (s: any) => projection.stream({
          point: (x: number, y: number) => { const [wx, wy] = wobble(x, y); s.point(wx, wy); },
          sphere: () => s.sphere?.(), lineStart: () => s.lineStart(), lineEnd: () => s.lineEnd(),
          polygonStart: () => s.polygonStart(), polygonEnd: () => s.polygonEnd(),
        } as any),
      })
    : projection;

  const landPath = geoPath(drawProjection);

  const land = LAND.map((f) => ({
    name: f.properties.name,
    d: landPath(f) ?? '',
    hero: HERO_COUNTRIES.includes(f.properties.name),
    near: NEAR.has(f.properties.name),
  }));

  // Each leg bows sideways from its chord: the control point sits LEG_BOWS × 2 × length to
  // the traveller's left (screen y runs down), which puts the curve's apex LEG_BOWS × length out.
  let run = 0;
  const legs: Leg[] = PLACES.slice(1).map((to, i) => {
    const a = projection([PLACES[i].lon, PLACES[i].lat]) as Pt;
    const b = projection([to.lon, to.lat]) as Pt;
    const bow = 2 * (LEG_BOWS[i] ?? 0);
    const c: Pt = [(a[0] + b[0]) / 2 + (b[1] - a[1]) * bow, (a[1] + b[1]) / 2 - (b[0] - a[0]) * bow];
    let length = 0;
    for (let s = 0; s < 32; s++) {
      const [x0, y0] = legPoint({ a, c, b }, s / 32);
      const [x1, y1] = legPoint({ a, c, b }, (s + 1) / 32);
      length += Math.hypot(x1 - x0, y1 - y0);
    }
    const leg = { a, c, b, start: run, length };
    run += length;
    return leg;
  });

  const p1 = projection([6, 44.8])!;
  const p2 = projection([6 + 100 / (111.32 * Math.cos((44.8 * Math.PI) / 180)), 44.8])!;

  const [[ew, en], [ee, es]] = [projection(EUROPE_BOX[3])!, projection(EUROPE_BOX[1])!];
  const kMin = Math.min(1, (W - 28) / (ee - ew), (H - 66) / (es - en));

  return {
    projection,
    land,
    legs,
    routeLength: run,
    // drawn through the same (wobbled) projection as the land, so borders meet its coast
    divisions: {
      region: landPath({ type: 'MultiLineString', coordinates: DIVISIONS.region }) ?? '',
      local: landPath({ type: 'MultiLineString', coordinates: DIVISIONS.local }) ?? '',
      clip: land.filter((c) => c.hero).map((c) => c.d).join(''),
    },
    rivers: landPath({ type: 'MultiLineString', coordinates: [...RIVERS.rhone, ...RIVERS.saone] }) ?? '',
    kmPer100: Math.abs(p2[0] - p1[0]),
    kMin,
  };
}

/** Smooth deterministic 2-D value noise in [-1, 1], ~50 px wavelength. */
export function inkWobble(scale = 1.2) {
  const hash = (x: number, y: number, s: number) => {
    const h = Math.sin(x * 127.1 + y * 311.7 + s * 74.7) * 43758.5453;
    return (h - Math.floor(h)) * 2 - 1;
  };
  const smooth = (x: number, y: number, s: number) => {
    const x0 = Math.floor(x), y0 = Math.floor(y), fx = x - x0, fy = y - y0;
    const u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
    const a = hash(x0, y0, s) + (hash(x0 + 1, y0, s) - hash(x0, y0, s)) * u;
    const b = hash(x0, y0 + 1, s) + (hash(x0 + 1, y0 + 1, s) - hash(x0, y0 + 1, s)) * u;
    return a + (b - a) * v;
  };
  return (x: number, y: number): [number, number] => [
    x + smooth(x * 0.02, y * 0.03, 1) * scale,
    y + smooth(x * 0.02, y * 0.03, 2) * scale,
  ];
}
