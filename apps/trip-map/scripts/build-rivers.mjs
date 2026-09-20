// The Rhône and the Saône from Natural Earth's 10m river centrelines, for the chart.
//
//   node scripts/build-rivers.mjs path/to/folder
//
// The folder holds (public domain, not in the repo):
//   ne-rivers.geojson         https://cdn.jsdelivr.net/gh/nvkelso/natural-earth-vector@master/geojson/ne_10m_rivers_lake_centerlines.geojson
//   ne-rivers-europe.geojson  https://cdn.jsdelivr.net/gh/nvkelso/natural-earth-vector@master/geojson/ne_10m_rivers_europe.geojson
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const dir = process.argv[2];
if (!dir) throw new Error('usage: node scripts/build-rivers.mjs folder');

const read = (f) => JSON.parse(readFileSync(join(dir, f), 'utf8')).features;
const parts = (name, features) => {
  const f = features.find((x) => x.properties.name === name);
  if (!f) throw new Error(`${name} not found`);
  return f.geometry.type === 'LineString' ? [f.geometry.coordinates] : f.geometry.coordinates;
};
const one = (name, features) => {
  const ps = parts(name, features);
  if (ps.length !== 1) throw new Error(`${name}: expected one part, got ${ps.length}`);
  return ps[0];
};
const r3 = (v) => +v.toFixed(3);
const clean = (l) => l.map(([x, y]) => [r3(x), r3(y)]);
const southward = (l) => (l[0][1] > l.at(-1)[1] ? l : [...l].reverse());

const main = read('ne-rivers.geojson');
const europe = read('ne-rivers-europe.geojson');

// Rhône from Geneva to the sea, with both arms of the delta. The Swiss reach above Lake
// Geneva is left out: the lake isn't drawn, so that stretch would float beyond a gap.
const rhone = parts('Rhône', main).filter((l) => l.length > 2 && l[0][0] < 6.5);

// Saône: the main file has only the lower river (misspelt "Sane"), the Europe supplement
// only the upper; joined here into one line from the source down to Lyon.
const upper = southward(one('Saône', europe));
const lower = southward(one('Sane', main));
const gap = Math.hypot(upper.at(-1)[0] - lower[0][0], upper.at(-1)[1] - lower[0][1]);
if (gap > 0.3) throw new Error(`the two Saône reaches are ${gap.toFixed(2)}° apart`);

const out = { rhone: rhone.map(clean), saone: [clean([...upper, ...lower])] };

const file = new URL('../src/data/rivers.json', import.meta.url);
writeFileSync(file, JSON.stringify(out));
const end = (p) => p.map((v) => v.toFixed(2)).join(', ');
console.log(`wrote ${readFileSync(file).length} bytes`);
out.rhone.forEach((l, i) => console.log(`  Rhône ${i}: ${l.length} pts, ${end(l[0])} → ${end(l.at(-1))}`));
console.log(`  Saône: ${out.saone[0].length} pts, ${end(out.saone[0][0])} → ${end(out.saone[0].at(-1))} (joined across ${gap.toFixed(3)}°)`);
