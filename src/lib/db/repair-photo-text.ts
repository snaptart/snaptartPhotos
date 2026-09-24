import { config } from "dotenv";
config({ path: ".env.local" });
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { eq } from "drizzle-orm";
import { photos } from "./schema";
import { extractPhotoMetadata, repairUtf8 } from "../photo-exif";

/**
 * Repairs photo titles, descriptions, locations and tags that were garbled on
 * upload ("PiÃ©tonne" for "Piétonne" — see repairUtf8). Lists what it would
 * change; pass --apply to write it.
 *
 * Text is repaired where it stands, keeping any edits. A garbled location is
 * read again from the original file instead: it joined IPTC's garbled, cut-off
 * copy of the place with XMP's clean one, and the joined text can't be split
 * back apart reliably.
 */
const APPLY = process.argv.includes("--apply");

async function repairPhotoText() {
  const db = drizzle(neon(process.env.DATABASE_URL!));
  const rows = await db
    .select({ id: photos.id, blobUrl: photos.blobUrl, title: photos.title, description: photos.description, location: photos.location, tags: photos.tags })
    .from(photos);

  let changed = 0;
  for (const row of rows) {
    const fix = (s: string | null) => (s === null ? null : repairUtf8(s));

    let location = row.location;
    if (location !== null && repairUtf8(location) !== location) {
      const res = await fetch(row.blobUrl);
      const reread = res.ok ? (await extractPhotoMetadata(Buffer.from(await res.arrayBuffer()))).location : null;
      if (!res.ok) console.warn(`  ${row.id} — couldn't fetch the original (${res.status}); repairing the text instead`);
      location = reread ?? repairUtf8(location);
    }

    const next = {
      title: fix(row.title),
      description: fix(row.description),
      location,
      tags: row.tags?.map(repairUtf8) ?? null,
    };
    const diffs = (["title", "description", "location"] as const).filter((k) => next[k] !== row[k]);
    const tagsDiffer = JSON.stringify(next.tags) !== JSON.stringify(row.tags);
    if (!diffs.length && !tagsDiffer) continue;

    changed++;
    console.log(`\n${row.id}`);
    for (const k of diffs) console.log(`  ${k}: ${JSON.stringify(row[k])}\n    → ${JSON.stringify(next[k])}`);
    if (tagsDiffer) console.log(`  tags: ${JSON.stringify(row.tags)}\n    → ${JSON.stringify(next.tags)}`);
    if (APPLY) await db.update(photos).set({ ...next, updatedAt: new Date() }).where(eq(photos.id, row.id));
  }

  console.log(`\n${changed} of ${rows.length} photos ${APPLY ? "repaired" : "would change (run with --apply to write)"}.`);
}

repairPhotoText().catch((e) => {
  console.error(e);
  process.exit(1);
});
