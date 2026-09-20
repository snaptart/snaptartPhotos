// Extracts the countries the chart draws from Natural Earth's world-atlas TopoJSON
// and writes a compact GeoJSON bundle for offline use.
//
//   node scripts/build-geometry.mjs path/to/countries-50m.json
//
// Source: https://cdn.jsdelivr.net/npm/world-atlas@2.0.2/countries-50m.json (public domain)
//
// The countries of Europe (Russia and Turkey left out), clipped to WINDOW so overseas
// territories such as French Guiana drop away.
import { readFileSync, writeFileSync } from 'node:fs';
import { geoArea } from 'd3-geo';
import { feature } from 'topojson-client';

const NAMES = [
  'Albania', 'Andorra', 'Austria', 'Belarus', 'Belgium', 'Bosnia and Herz.', 'Bulgaria', 'Croatia',
  'Cyprus', 'N. Cyprus', 'Czechia', 'Denmark', 'Estonia', 'Faeroe Is.', 'Finland', 'Åland', 'France',
  'Germany', 'Greece', 'Guernsey', 'Hungary', 'Iceland', 'Ireland', 'Isle of Man', 'Italy', 'Jersey',
  'Kosovo', 'Latvia', 'Liechtenstein', 'Lithuania', 'Luxembourg', 'Macedonia', 'Malta', 'Moldova',
  'Monaco', 'Montenegro', 'Netherlands', 'Norway', 'Poland', 'Portugal', 'Romania', 'San Marino',
  'Serbia', 'Slovakia', 'Slovenia', 'Spain', 'Sweden', 'Switzerland', 'Ukraine', 'United Kingdom',
  'Vatican',
];

/** [west, south, east, north] in degrees: Azores to Ukraine, Canaries to Svalbard. */
const WINDOW = [-32, 27, 45, 82];

const src = process.argv[2];
if (!src) throw new Error('usage: node scripts/build-geometry.mjs countries-50m.json');

const topo = JSON.parse(readFileSync(src, 'utf8'));

// ~110 m precision is far finer than the 50m source resolution
const r3 = (v) => +v.toFixed(3);

/** Sutherland–Hodgman clip of one closed lon/lat ring against WINDOW. */
function clipRing(ring) {
  const [w, s, e, n] = WINDOW;
  const edges = [
    [(p) => p[0] >= w, (a, b) => [w, a[1] + ((b[1] - a[1]) * (w - a[0])) / (b[0] - a[0])]],
    [(p) => p[0] <= e, (a, b) => [e, a[1] + ((b[1] - a[1]) * (e - a[0])) / (b[0] - a[0])]],
    [(p) => p[1] >= s, (a, b) => [a[0] + ((b[0] - a[0]) * (s - a[1])) / (b[1] - a[1]), s]],
    [(p) => p[1] <= n, (a, b) => [a[0] + ((b[0] - a[0]) * (n - a[1])) / (b[1] - a[1]), n]],
  ];
  let pts = ring.slice(0, -1);
  for (const [inside, cross] of edges) {
    if (!pts.length) break;
    const out = [];
    pts.forEach((cur, i) => {
      const prev = pts[(i + pts.length - 1) % pts.length];
      if (inside(cur)) {
        if (!inside(prev)) out.push(cross(prev, cur));
        out.push(cur);
      } else if (inside(prev)) {
        out.push(cross(prev, cur));
      }
    });
    pts = out;
  }
  pts = pts.map(([x, y]) => [r3(x), r3(y)])
    .filter((p, i, a) => i === 0 || p[0] !== a[i - 1][0] || p[1] !== a[i - 1][1]);
  // drop slivers left along the window edge
  let area = 0;
  pts.forEach((p, i) => { const q = pts[(i + 1) % pts.length]; area += p[0] * q[1] - q[0] * p[1]; });
  if (pts.length < 3 || Math.abs(area) < 1e-4) return null;
  return [...pts, pts[0]];
}

// d3-geo reads winding on the sphere: a ring enclosing more than a hemisphere is the
// globe minus that ring. Clipping can flip a sliver, which then floods the whole sea.
const isInverted = (ring) => geoArea({ type: 'Polygon', coordinates: [ring] }) > 2 * Math.PI;
const orient = (ring, hole) => (isInverted(ring) !== hole ? [...ring].reverse() : ring);

const clipPolygon = (rings) => {
  const outer = clipRing(rings[0]);
  if (!outer) return null;
  return [orient(outer, false), ...rings.slice(1).map(clipRing).filter(Boolean).map((r) => orient(r, true))];
};

const features = [];
for (const f of feature(topo, topo.objects.countries).features) {
  if (!f.geometry || !NAMES.includes(f.properties.name)) continue;
  const polys = f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates;
  const clipped = polys.map(clipPolygon).filter(Boolean);
  if (!clipped.length) continue;
  features.push({
    type: 'Feature',
    properties: { name: f.properties.name },
    geometry: clipped.length === 1
      ? { type: 'Polygon', coordinates: clipped[0] }
      : { type: 'MultiPolygon', coordinates: clipped },
  });
}

const missing = NAMES.filter((n) => !features.some((f) => f.properties.name === n));
if (missing.length) console.warn('missing:', missing.join(', '));

const out = { type: 'FeatureCollection', features };
writeFileSync(new URL('../src/data/land.json', import.meta.url), JSON.stringify(out));
console.log(`wrote ${features.length} features: ${features.map((f) => f.properties.name).join(', ')}`);
