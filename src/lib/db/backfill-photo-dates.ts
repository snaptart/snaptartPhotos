import { config } from "dotenv";
config({ path: ".env.local" });
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { eq } from "drizzle-orm";
import { photos } from "./schema";
import { extractFilenameFromBlobUrl, parseFilenameForTakenAt } from "../photo-metadata";

async function backfillPhotoDates() {
  const sql = neon(process.env.DATABASE_URL!);
  const db = drizzle(sql);

  const allPhotos = await db.select().from(photos);
  console.log(`Found ${allPhotos.length} photos to process`);

  let filenameUpdated = 0;
  let takenAtUpdated = 0;
  let noPattern = 0;
  let skipped = 0;

  for (const photo of allPhotos) {
    const patch: { filename?: string; takenAt?: Date } = {};

    let filename = photo.filename;
    if (!filename) {
      const extracted = extractFilenameFromBlobUrl(photo.blobUrl);
      if (extracted) {
        filename = extracted;
        patch.filename = extracted;
      }
    }

    if (!photo.takenAt && filename) {
      const parsed = parseFilenameForTakenAt(filename);
      if (parsed) patch.takenAt = parsed;
    }

    if (Object.keys(patch).length === 0) {
      if (!photo.takenAt && filename && !parseFilenameForTakenAt(filename)) {
        noPattern++;
        console.log(`  ${photo.id} — no date pattern in "${filename}"`);
      } else {
        skipped++;
      }
      continue;
    }

    await db.update(photos).set(patch).where(eq(photos.id, photo.id));
    if (patch.filename) filenameUpdated++;
    if (patch.takenAt) takenAtUpdated++;
    console.log(
      `  ${photo.id} — ${patch.filename ? `filename="${patch.filename}" ` : ""}${patch.takenAt ? `takenAt=${patch.takenAt.toISOString()}` : ""}`,
    );
  }

  console.log(
    `\nComplete: ${filenameUpdated} filenames set, ${takenAtUpdated} dates set, ${noPattern} without date pattern, ${skipped} already complete`,
  );
}

backfillPhotoDates();
