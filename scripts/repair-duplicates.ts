/**
 * Repair pass for the scraped metadata apply:
 *   - matches DB rows by filename stem (handles .png/.jpg differences)
 *   - updates ALL DB rows sharing that stem (not just the first one),
 *     so photos duplicated across galleries all get populated
 *   - writes location directly as coord-link markdown (no plain-text pass)
 *
 * Safe to re-run: only fills empty fields (title, tags, lat, lng), and
 * only overwrites `location` if it is empty or matches the plain tag-joined
 * string we wrote previously.
 *
 * Dry-run by default. Pass --apply to write.
 *
 * Run: npx tsx scripts/repair-duplicates.ts
 *      npx tsx scripts/repair-duplicates.ts --apply
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
  location: string | null; // tag-joined plain string from scraper
  latitude: number | null;
  longitude: number | null;
  tags: string[];
  legacyImageUrl: string;
}

const APPLY = process.argv.includes("--apply");

function stem(filename: string): string {
  return filename.replace(/\.[^.]+$/, "").toLowerCase();
}

function decimalToDms(dec: number, isLat: boolean): string {
  const hem = dec < 0 ? (isLat ? "S" : "W") : isLat ? "N" : "E";
  const abs = Math.abs(dec);
  const deg = Math.floor(abs);
  const minFloat = (abs - deg) * 60;
  const min = Math.floor(minFloat);
  const sec = (minFloat - min) * 60;
  const minStr = String(min).padStart(2, "0");
  const secStr = sec.toFixed(1).padStart(4, "0");
  return `${deg}°${minStr}'${secStr}"${hem}`;
}

function buildLocationMarkdown(lat: number, lng: number): string {
  const latDms = decimalToDms(lat, true);
  const lngDms = decimalToDms(lng, false);
  const text = `${latDms}, ${lngDms}`;
  const encode = (s: string) => s.replace(/°/g, "%C2%B0").replace(/"/g, "%22");
  const urlPath = `${encode(latDms)}+${encode(lngDms)}`;
  return `[${text}](https://www.google.com/maps/place/${urlPath})`;
}

async function main() {
  const scrapePath = resolve("scripts/scrape/scrape-output.json");
  const scraped: ScrapedPhoto[] = JSON.parse(readFileSync(scrapePath, "utf8"));
  console.log(`Loaded ${scraped.length} scraped records`);

  const allPhotos = await db.select().from(photos);
  console.log(`Loaded ${allPhotos.length} DB photos\n`);

  // Index DB by stem (allowing many rows per stem)
  const byStem = new Map<string, typeof allPhotos>();
  const byTitle = new Map<string, typeof allPhotos>();
  for (const p of allPhotos) {
    if (p.filename) {
      const k = stem(p.filename);
      if (!byStem.has(k)) byStem.set(k, []);
      byStem.get(k)!.push(p);
    }
    if (p.title) {
      const k = p.title.toLowerCase();
      if (!byTitle.has(k)) byTitle.set(k, []);
      byTitle.get(k)!.push(p);
    }
  }

  type Update = {
    dbRow: typeof allPhotos[number];
    updates: Record<string, unknown>;
    reasons: string[];
    matchedBy: "stem" | "title";
  };
  const updates: Update[] = [];
  const noMatch: ScrapedPhoto[] = [];

  for (const s of scraped) {
    const key = stem(s.filename);
    let rows = byStem.get(key);
    let matchedBy: "stem" | "title" = "stem";
    if ((!rows || rows.length === 0) && s.title) {
      rows = byTitle.get(s.title.toLowerCase());
      matchedBy = "title";
    }

    // "image-asset" is a Squarespace fallback and shouldn't match by stem —
    // those need the title fallback only.
    if (matchedBy === "stem" && key.startsWith("image-asset")) {
      rows = s.title ? byTitle.get(s.title.toLowerCase()) : undefined;
      matchedBy = "title";
    }

    if (!rows || rows.length === 0) {
      noMatch.push(s);
      continue;
    }

    for (const dbRow of rows) {
      const patch: Record<string, unknown> = {};
      const reasons: string[] = [];

      if (!dbRow.title && s.title) { patch.title = s.title; reasons.push("title"); }
      if ((!dbRow.tags || dbRow.tags.length === 0) && s.tags.length > 0) {
        patch.tags = s.tags; reasons.push("tags");
      }
      if (dbRow.latitude === null && s.latitude !== null) {
        patch.latitude = s.latitude; reasons.push("lat");
      }
      if (dbRow.longitude === null && s.longitude !== null) {
        patch.longitude = s.longitude; reasons.push("lng");
      }
      if (s.latitude !== null && s.longitude !== null) {
        const md = buildLocationMarkdown(s.latitude, s.longitude);
        const cur = dbRow.location;
        const isEmpty = !cur || cur.trim() === "";
        const isPlain = cur !== null && cur === s.location;
        if (isEmpty || isPlain) {
          patch.location = md; reasons.push(isPlain ? "location(plain→md)" : "location");
        }
      }

      if (Object.keys(patch).length > 0) {
        updates.push({ dbRow, updates: patch, reasons, matchedBy });
      }
    }
  }

  console.log(`=== SUMMARY ===`);
  console.log(`  would update: ${updates.length} DB rows`);
  console.log(`  no DB match : ${noMatch.length} scraped records`);
  console.log();

  if (updates.length > 0) {
    console.log(`=== WOULD UPDATE ===`);
    for (const u of updates) {
      const fn = u.dbRow.filename ?? "(no filename)";
      const title = u.dbRow.title ?? "(no title)";
      console.log(`  [${u.matchedBy}] ${fn}  (${title})  → ${u.reasons.join(", ")}`);
    }
    console.log();
  }

  if (noMatch.length > 0) {
    console.log(`=== NO MATCH (scraped records with no DB row) ===`);
    for (const s of noMatch) {
      console.log(`  [${s.gallery}] ${s.filename}  (${s.title})`);
    }
    console.log();
  }

  if (!APPLY) {
    console.log(`Dry run. Pass --apply to write ${updates.length} updates.`);
    return;
  }

  console.log(`Applying ${updates.length} updates...`);
  let written = 0;
  for (const u of updates) {
    await db.update(photos).set(u.updates).where(eq(photos.id, u.dbRow.id));
    written++;
  }
  console.log(`Done. Updated ${written} rows.`);
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
