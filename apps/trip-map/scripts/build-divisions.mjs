// Internal borders of France's régions / départements and Italy's regioni / province.
// Only borders *between* divisions are kept: coasts and national frontiers come from
// land.json, so the two sources never have to agree on a coastline.
//
//   node scripts/build-divisions.mjs path/to/folder
//
// The folder holds (open data, not in the repo):
//   fr-departements.geojson  https://etalab-datasets.geo.data.gouv.fr/contours-administratifs/2024/geojson/departements-100m.geojson
//   fr-epci.geojson          https://etalab-datasets.geo.data.gouv.fr/contours-administratifs/2024/geojson/epci-100m.geojson
//   it-provinces.geojson     https://cdn.jsdelivr.net/gh/openpolis/geojson-italy@master/geojson/limits_IT_provinces.geojson
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { mesh } from 'topojson-client';
import { topology } from 'topojson-server';
import { presimplify, simplify } from 'topojson-simplify';

const dir = process.argv[2];
if (!dir) throw new Error('usage: node scripts/build-divisions.mjs folder');
const read = (f) => JSON.parse(readFileSync(join(dir, f), 'utf8'));

/** Planar Visvalingam weight, in square degrees: corners of ~0.01° (a few px at 7×) survive. */
const MIN_WEIGHT = 5e-5;

const unit = (region, name) => (f) => ({
  type: 'Feature',
  properties: { region: region(f.properties), name: name(f.properties) },
  geometry: f.geometry,
});

// metropolitan départements only (overseas codes have three digits)
const fr = read('fr-departements.geojson').features
  .filter((f) => f.properties.code.length === 2)
  .map(unit((p) => `fr${p.region}`, (p) => p.nom));
const it = read('it-provinces.geojson').features
  .map(unit((p) => `it${p.reg_istat_code}`, (p) => p.prov_name));
// The data still has Rhône whole; the Métropole (its own collectivity since 2015) is drawn over it.
const lyon = read('fr-epci.geojson').features.find((f) => f.properties.nom === 'Métropole de Lyon');
if (!lyon) throw new Error('Métropole de Lyon not found');

const topo = simplify(presimplify(topology({
  units: { type: 'FeatureCollection', features: [...fr, ...it] },
  lyon: { ...lyon, properties: { region: 'fr84', name: 'Métropole de Lyon' } },
}, 1e5)), MIN_WEIGHT);

const r3 = (v) => +v.toFixed(3);
const lines = (m) => m.coordinates.map((l) => l.map(([x, y]) => [r3(x), r3(y)])).filter((l) => l.length > 1);
const units = topo.objects.units;

const out = {
  region: lines(mesh(topo, units, (a, b) => a !== b && a.properties.region !== b.properties.region)),
  local: [
    ...lines(mesh(topo, units, (a, b) => a !== b && a.properties.region === b.properties.region)),
    ...lines(mesh(topo, topo.objects.lyon)),
  ],
};

const file = new URL('../src/data/divisions.json', import.meta.url);
writeFileSync(file, JSON.stringify(out));
const points = (ls) => ls.reduce((n, l) => n + l.length, 0);
console.log(`wrote ${readFileSync(file).length} bytes: region ${points(out.region)} pts, local ${points(out.local)} pts`);

// Planar centroids of the labelled divisions, to help place their names in places.ts.
const centroid = (g) => {
  const rings = (g.type === 'Polygon' ? [g.coordinates] : g.coordinates).map((p) => p[0]);
  let a = 0, x = 0, y = 0;
  for (const r of rings) {
    for (let i = 0; i < r.length - 1; i++) {
      const c = r[i][0] * r[i + 1][1] - r[i + 1][0] * r[i][1];
      a += c; x += (r[i][0] + r[i + 1][0]) * c; y += (r[i][1] + r[i + 1][1]) * c;
    }
  }
  return [(x / (3 * a)).toFixed(2), (y / (3 * a)).toFixed(2)];
};
for (const f of [...fr, ...it, { properties: { name: 'Métropole de Lyon' }, geometry: lyon.geometry }]) {
  if (['Vaucluse', 'Bouches-du-Rhône', 'Alpes-Maritimes', 'Savona', 'Métropole de Lyon'].includes(f.properties.name)) {
    console.log(`  ${f.properties.name}: ${centroid(f.geometry).join(', ')}`);
  }
}
