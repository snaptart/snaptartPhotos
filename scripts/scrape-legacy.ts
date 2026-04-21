/**
 * Scrapes photo metadata from the legacy Squarespace snaptart site.
 *
 * Output: scripts/scrape/scrape-output.json — one record per legacy photo
 * with { gallery, filename, title, location, latitude, longitude, tags,
 * legacyImageUrl }. Location is a ", "-joined tag string.
 *
 * No DB writes here — review the JSON, then run apply-scrape.ts.
 *
 * Run: npx tsx scripts/scrape-legacy.ts
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";

const GALLERIES: { slug: string; url: string }[] = [
  { slug: "minnesota", url: "https://snaptart.squarespace.com/minnesota" },
  { slug: "france", url: "https://snaptart.squarespace.com/france" },
  { slug: "united-states", url: "https://snaptart.squarespace.com/united-states" },
  { slug: "europe", url: "https://snaptart.squarespace.com/europe" },
  { slug: "people", url: "https://snaptart.squarespace.com/people" },
  { slug: "things", url: "https://snaptart.squarespace.com/things" },
];

interface ScrapedPhoto {
  gallery: string;
  filename: string;
  title: string | null;
  location: string | null;
  latitude: number | null;
  longitude: number | null;
  tags: string[];
  legacyImageUrl: string;
}

function decodeHtmlEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&mdash;/g, "—")
    .replace(/&nbsp;/g, " ");
}

function dmsToDecimal(deg: number, min: number, sec: number, hem: string): number {
  const d = deg + min / 60 + sec / 3600;
  return hem === "S" || hem === "W" ? -d : d;
}

function parseCoords(descHtml: string): { lat: number; lng: number } | null {
  // Description is HTML-encoded twice: once as an attribute, once the inner <a> text uses &quot;
  // After decoding once we get something like: <a href="...">47°11'58.1"N 91°22'45.9"W</a>
  const decoded = decodeHtmlEntities(descHtml);
  const matches = [...decoded.matchAll(/(\d+)°(\d+)'([\d.]+)"?([NSEW])/g)];
  if (matches.length < 2) return null;
  const [latM, lngM] = matches;
  const lat = dmsToDecimal(+latM[1], +latM[2], +latM[3], latM[4]);
  const lng = dmsToDecimal(+lngM[1], +lngM[2], +lngM[3], lngM[4]);
  return { lat, lng };
}

function extractFilename(imageUrl: string): string | null {
  // e.g. https://images.squarespace-cdn.com/content/v1/.../UUID/20200904_194523_DSC_0029.jpg
  const m = imageUrl.match(/\/([^/]+\.(?:jpe?g|png|webp|tiff?|gif))(?:\?|$)/i);
  return m ? m[1] : null;
}

function extractTags(tagSpanHtml: string): string[] {
  const tags = [...tagSpanHtml.matchAll(/<a[^>]*>([^<]+)<\/a>/g)].map((m) => m[1].trim());
  return tags;
}

function parseGalleryHtml(html: string, gallerySlug: string): ScrapedPhoto[] {
  // Split on the summary-item marker — we verified 1:1 with data-title per gallery.
  const chunks = html.split(/<div class="\s*\n?\s*summary-item\s*\n?\s*summary-item-record-type-image/);
  const photos: ScrapedPhoto[] = [];

  // Skip chunks[0] (pre-first-item header)
  for (let i = 1; i < chunks.length; i++) {
    const chunk = chunks[i];

    const titleM = chunk.match(/data-title="([^"]*)"/);
    const descM = chunk.match(/data-description="([^"]*)"/);
    const imgM = chunk.match(/data-image="([^"]+)"/);
    const tagSpanM = chunk.match(/<span class="summary-metadata-item summary-metadata-item--tags">([\s\S]*?)<\/span>/);

    if (!imgM) continue;
    const legacyImageUrl = imgM[1];
    const filename = extractFilename(legacyImageUrl);
    if (!filename) continue;

    const title = titleM ? decodeHtmlEntities(titleM[1]) : null;
    const coords = descM ? parseCoords(descM[1]) : null;
    const tags = tagSpanM ? extractTags(tagSpanM[1]) : [];
    const location = tags.length > 0 ? tags.join(", ") : null;

    photos.push({
      gallery: gallerySlug,
      filename,
      title,
      location,
      latitude: coords?.lat ?? null,
      longitude: coords?.lng ?? null,
      tags,
      legacyImageUrl,
    });
  }

  return photos;
}

async function fetchHtml(url: string): Promise<string> {
  const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
  if (!res.ok) throw new Error(`${url} → ${res.status}`);
  return res.text();
}

async function main() {
  const outDir = resolve("scripts/scrape");
  mkdirSync(outDir, { recursive: true });

  const all: ScrapedPhoto[] = [];
  for (const g of GALLERIES) {
    process.stdout.write(`  ${g.slug} ... `);
    try {
      const html = await fetchHtml(g.url);
      const photos = parseGalleryHtml(html, g.slug);
      all.push(...photos);
      console.log(`${photos.length} photos`);
    } catch (err) {
      console.log(`FAILED (${(err as Error).message})`);
    }
  }

  const outPath = resolve(outDir, "scrape-output.json");
  writeFileSync(outPath, JSON.stringify(all, null, 2));
  console.log(`\nWrote ${all.length} records → ${outPath}`);

  const missingCoords = all.filter((p) => p.latitude === null).length;
  const missingTitle = all.filter((p) => !p.title).length;
  const missingTags = all.filter((p) => p.tags.length === 0).length;
  console.log(`  - missing coords: ${missingCoords}`);
  console.log(`  - missing title:  ${missingTitle}`);
  console.log(`  - missing tags:   ${missingTags}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
