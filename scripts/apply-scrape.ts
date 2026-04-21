/**
 * Applies scraped legacy metadata to the photos table.
 * Matches by filename (primary) or title (fallback for image-asset.jpeg cases).
 *
 * Dry-run by default — prints a report of what would change.
 * Pass --apply to actually write.
 *
 * Safety: only fills empty fields. Never overwrites existing non-null values.
 *
 * Run: npx tsx scripts/apply-scrape.ts           # dry run
 *      npx tsx scripts/apply-scrape.ts --apply   # write
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

async function main() {
  const scrapePath = resolve("scripts/scrape/scrape-output.json");
  const scraped: ScrapedPhoto[] = JSON.parse(readFileSync(scrapePath, "utf8"));
  console.log(`Loaded ${scraped.length} scraped records from ${scrapePath}`);

  const allPhotos = await db.select().from(photos);
  console.log(`Loaded ${allPhotos.length} photos from DB\n`);

  const byFilename = new Map<string, typeof allPhotos[number]>();
  const byTitle = new Map<string, typeof allPhotos[number]>();
  for (const p of allPhotos) {
    if (p.filename) byFilename.set(p.filename.toLowerCase(), p);
    if (p.title) byTitle.set(p.title.toLowerCase(), p);
  }

  type Action =
    | { kind: "match"; scraped: ScrapedPhoto; dbRow: typeof allPhotos[number]; matchedBy: "filename" | "title"; updates: Record<string, unknown> }
    | { kind: "no-match"; scraped: ScrapedPhoto }
    | { kind: "nothing-to-update"; scraped: ScrapedPhoto; dbRow: typeof allPhotos[number]; matchedBy: "filename" | "title" };

  const actions: Action[] = [];

  for (const s of scraped) {
    let dbRow = byFilename.get(s.filename.toLowerCase());
    let matchedBy: "filename" | "title" = "filename";

    if (!dbRow && s.title) {
      const byT = byTitle.get(s.title.toLowerCase());
      if (byT) {
        dbRow = byT;
        matchedBy = "title";
      }
    }

    if (!dbRow) {
      actions.push({ kind: "no-match", scraped: s });
      continue;
    }

    const updates: Record<string, unknown> = {};
    if (!dbRow.title && s.title) updates.title = s.title;
    if (!dbRow.location && s.location) updates.location = s.location;
    if (dbRow.latitude === null && s.latitude !== null) updates.latitude = s.latitude;
    if (dbRow.longitude === null && s.longitude !== null) updates.longitude = s.longitude;
    if ((!dbRow.tags || dbRow.tags.length === 0) && s.tags.length > 0) updates.tags = s.tags;

    if (Object.keys(updates).length === 0) {
      actions.push({ kind: "nothing-to-update", scraped: s, dbRow, matchedBy });
    } else {
      actions.push({ kind: "match", scraped: s, dbRow, matchedBy, updates });
    }
  }

  const matches = actions.filter((a) => a.kind === "match");
  const noMatches = actions.filter((a) => a.kind === "no-match");
  const nothingToUpdate = actions.filter((a) => a.kind === "nothing-to-update");

  console.log(`=== SUMMARY ===`);
  console.log(`  would update:      ${matches.length}`);
  console.log(`  already populated: ${nothingToUpdate.length}`);
  console.log(`  no DB match:       ${noMatches.length}`);
  console.log();

  if (matches.length > 0) {
    console.log(`=== WOULD UPDATE ===`);
    for (const a of matches) {
      if (a.kind !== "match") continue;
      const fields = Object.keys(a.updates).join(", ");
      console.log(`  [${a.matchedBy}] ${a.scraped.filename}  (${a.scraped.title})  → ${fields}`);
    }
    console.log();
  }

  if (noMatches.length > 0) {
    console.log(`=== NO MATCH (need manual upload or title fix) ===`);
    for (const a of noMatches) {
      if (a.kind !== "no-match") continue;
      console.log(`  [${a.scraped.gallery}] ${a.scraped.filename}  (${a.scraped.title})`);
    }
    console.log();
  }

  if (!APPLY) {
    console.log(`Dry run. Pass --apply to write ${matches.length} updates.`);
    return;
  }

  console.log(`Applying ${matches.length} updates...`);
  let written = 0;
  for (const a of actions) {
    if (a.kind !== "match") continue;
    await db.update(photos).set(a.updates).where(eq(photos.id, a.dbRow.id));
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
