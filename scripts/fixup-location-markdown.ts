/**
 * Replaces plain-text locations I wrote via apply-scrape.ts with the
 * coord-link markdown format used on the manually-edited photos, e.g.
 *   [47°11'58.1"N, 91°22'45.9"W](https://www.google.com/maps/place/...)
 *
 * Only overwrites if the current location is empty OR exactly equals the
 * plain tag-joined string I wrote earlier. Never touches manually-entered
 * values.
 *
 * Dry-run by default. Pass --apply to write.
 *
 * Run: npx tsx scripts/fixup-location-markdown.ts
 *      npx tsx scripts/fixup-location-markdown.ts --apply
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { db } from "@/lib/db";
import { photos } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

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

const APPLY = process.argv.includes("--apply");

function decimalToDms(dec: number, isLat: boolean): string {
  const hem = dec < 0 ? (isLat ? "S" : "W") : isLat ? "N" : "E";
  const abs = Math.abs(dec);
  const deg = Math.floor(abs);
  const minFloat = (abs - deg) * 60;
  const min = Math.floor(minFloat);
  const sec = (minFloat - min) * 60;
  const degStr = String(deg);
  const minStr = String(min).padStart(2, "0");
  const secStr = sec.toFixed(1).padStart(4, "0");
  return `${degStr}°${minStr}'${secStr}"${hem}`;
}

function buildLocationMarkdown(lat: number, lng: number): string {
  const latDms = decimalToDms(lat, true);
  const lngDms = decimalToDms(lng, false);
  const text = `${latDms}, ${lngDms}`;
  // Match user's convention: ° → %C2%B0, " → %22, ' literal, space → +
  const encode = (s: string) =>
    s.replace(/°/g, "%C2%B0").replace(/"/g, "%22");
  const urlPath = `${encode(latDms)}+${encode(lngDms)}`;
  return `[${text}](https://www.google.com/maps/place/${urlPath})`;
}

async function main() {
  const scrapePath = resolve("scripts/scrape/scrape-output.json");
  const scraped: ScrapedPhoto[] = JSON.parse(readFileSync(scrapePath, "utf8"));

  const allPhotos = await db.select().from(photos);

  const byFilename = new Map<string, typeof allPhotos[number]>();
  const byTitle = new Map<string, typeof allPhotos[number]>();
  for (const p of allPhotos) {
    if (p.filename) byFilename.set(p.filename.toLowerCase(), p);
    if (p.title) byTitle.set(p.title.toLowerCase(), p);
  }

  type Action =
    | { kind: "update"; dbRow: typeof allPhotos[number]; current: string | null; next: string; reason: string }
    | { kind: "skip-no-coords"; scraped: ScrapedPhoto }
    | { kind: "skip-no-match"; scraped: ScrapedPhoto }
    | { kind: "skip-manual"; scraped: ScrapedPhoto; current: string };

  const actions: Action[] = [];

  for (const s of scraped) {
    if (s.latitude === null || s.longitude === null) {
      actions.push({ kind: "skip-no-coords", scraped: s });
      continue;
    }

    let dbRow = byFilename.get(s.filename.toLowerCase());
    if (!dbRow && s.title) dbRow = byTitle.get(s.title.toLowerCase());
    if (!dbRow) {
      actions.push({ kind: "skip-no-match", scraped: s });
      continue;
    }

    const markdown = buildLocationMarkdown(s.latitude, s.longitude);
    const plainFromScrape = s.location; // the tag-joined string we wrote earlier
    const current = dbRow.location;

    if (current === null || current.trim() === "") {
      actions.push({ kind: "update", dbRow, current, next: markdown, reason: "was empty" });
    } else if (current === plainFromScrape) {
      actions.push({ kind: "update", dbRow, current, next: markdown, reason: "was plain tag string" });
    } else {
      actions.push({ kind: "skip-manual", scraped: s, current });
    }
  }

  const updates = actions.filter((a) => a.kind === "update");
  const skipManual = actions.filter((a) => a.kind === "skip-manual");
  const skipNoCoords = actions.filter((a) => a.kind === "skip-no-coords");
  const skipNoMatch = actions.filter((a) => a.kind === "skip-no-match");

  console.log(`=== SUMMARY ===`);
  console.log(`  would update:    ${updates.length}`);
  console.log(`  skip (manual):   ${skipManual.length}`);
  console.log(`  skip (no coords): ${skipNoCoords.length}`);
  console.log(`  skip (no match): ${skipNoMatch.length}`);
  console.log();

  if (updates.length > 0) {
    console.log(`=== WOULD UPDATE (first 5) ===`);
    for (const a of updates.slice(0, 5)) {
      if (a.kind !== "update") continue;
      console.log(`  ${a.dbRow.title ?? a.dbRow.filename}`);
      console.log(`    before: ${a.current ?? "(empty)"}`);
      console.log(`    after:  ${a.next}`);
      console.log(`    reason: ${a.reason}`);
    }
    if (updates.length > 5) console.log(`  ... and ${updates.length - 5} more`);
    console.log();
  }

  if (skipManual.length > 0) {
    console.log(`=== SKIPPED (manually entered) ===`);
    for (const a of skipManual) {
      if (a.kind !== "skip-manual") continue;
      console.log(`  ${a.scraped.title}  →  ${a.current}`);
    }
    console.log();
  }

  if (!APPLY) {
    console.log(`Dry run. Pass --apply to write ${updates.length} updates.`);
    return;
  }

  console.log(`Applying ${updates.length} updates...`);
  let written = 0;
  for (const a of actions) {
    if (a.kind !== "update") continue;
    await db.update(photos).set({ location: a.next }).where(eq(photos.id, a.dbRow.id));
    written++;
  }
  console.log(`Done. Updated ${written} rows.`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
