// Generates the tileable paper-grain PNG used on native, where SVG feTurbulence
// is unavailable. Mirrors the web filter: grey fractal noise, alpha mapped 0 → .35.
//
//   node scripts/build-paper-texture.mjs
import { writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';

const SIZE = 256;

// Tileable value noise with a few octaves.
let seed = 7;
const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
function octave(cells) {
  const g = Array.from({ length: cells * cells }, rand);
  const at = (x, y) => g[((y % cells) + cells) % cells * cells + ((x % cells) + cells) % cells];
  return (px, py) => {
    const fx = (px / SIZE) * cells, fy = (py / SIZE) * cells;
    const x0 = Math.floor(fx), y0 = Math.floor(fy);
    const sx = fx - x0, sy = fy - y0;
    const s = (t) => t * t * (3 - 2 * t);
    const a = at(x0, y0) + (at(x0 + 1, y0) - at(x0, y0)) * s(sx);
    const b = at(x0, y0 + 1) + (at(x0 + 1, y0 + 1) - at(x0, y0 + 1)) * s(sx);
    return a + (b - a) * s(sy);
  };
}
const octaves = [256, 128, 64, 32].map(octave);

const raw = Buffer.alloc(SIZE * (SIZE * 2 + 1));
for (let y = 0; y < SIZE; y++) {
  raw[y * (SIZE * 2 + 1)] = 0; // filter: none
  for (let x = 0; x < SIZE; x++) {
    let n = 0, amp = 1, norm = 0;
    for (const o of octaves) { n += o(x, y) * amp; norm += amp; amp /= 2; }
    n /= norm;
    const i = y * (SIZE * 2 + 1) + 1 + x * 2;
    raw[i] = Math.round(n * 255);          // grey
    raw[i + 1] = Math.round(n * 0.35 * 255); // alpha
  }
}

const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc32 = (buf) => {
  let c = 0xffffffff;
  for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
const chunk = (type, data) => {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
};

const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(SIZE, 0); ihdr.writeUInt32BE(SIZE, 4);
ihdr[8] = 8; ihdr[9] = 4; // 8-bit grey + alpha

writeFileSync(new URL('../assets/textures/paper-grain.png', import.meta.url), Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  chunk('IHDR', ihdr),
  chunk('IDAT', deflateSync(raw)),
  chunk('IEND', Buffer.alloc(0)),
]));
console.log('wrote assets/textures/paper-grain.png');
