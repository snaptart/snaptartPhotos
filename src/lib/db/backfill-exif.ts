import { config } from "dotenv";
config({ path: ".env.local" });
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { eq } from "drizzle-orm";
import { photos } from "./schema";
import { extractPhotoMetadata } from "../photo-exif";

const FORCE = process.argv.includes("--force");
const ONLY_ID = process.argv.find((a) => a.startsWith("--id="))?.slice(5);

async function backfillExif() {
  const sql = neon(process.env.DATABASE_URL!);
  const db = drizzle(sql);

  const all = ONLY_ID
    ? await db.select().from(photos).where(eq(photos.id, ONLY_ID))
    : await db.select().from(photos);
  console.log(`Found ${all.length} photo${all.length === 1 ? "" : "s"} to process${FORCE ? " (force mode)" : ""}`);

  let updated = 0;
  let skipped = 0;
  let failed = 0;

  for (const photo of all) {
    if (!FORCE && photo.cameraSettings) {
      skipped++;
      continue;
    }

    try {
      const res = await fetch(photo.blobUrl);
      if (!res.ok) {
        console.warn(`  ${photo.id} — fetch failed (${res.status})`);
        failed++;
        continue;
      }
      const buffer = Buffer.from(await res.arrayBuffer());
      const meta = await extractPhotoMetadata(buffer);

      // Only fill columns that are currently empty (unless --force).
      const patch: Record<string, unknown> = {};
      if (FORCE || photo.takenAt == null) {
        if (meta.takenAt) patch.takenAt = meta.takenAt;
      }
      if (FORCE || photo.latitude == null) {
        if (meta.latitude !== null) patch.latitude = meta.latitude;
      }
      if (FORCE || photo.longitude == null) {
        if (meta.longitude !== null) patch.longitude = meta.longitude;
      }
      if (FORCE || !photo.location) {
        if (meta.location) patch.location = meta.location;
      }
      if (FORCE || !photo.description) {
        if (meta.description) patch.description = meta.description;
      }
      if (FORCE || !photo.tags || photo.tags.length === 0) {
        if (meta.tags && meta.tags.length) patch.tags = meta.tags;
      }
      if (FORCE || !photo.cameraSettings) {
        if (meta.cameraSettings) patch.cameraSettings = meta.cameraSettings;
      }
      // Width/height: trust EXIF only if currently zero/missing.
      if (!photo.width || !photo.height) {
        if (meta.width && meta.height) {
          patch.width = meta.width;
          patch.height = meta.height;
        }
      }

      if (Object.keys(patch).length === 0) {
        skipped++;
        continue;
      }

      patch.updatedAt = new Date();
      await db.update(photos).set(patch).where(eq(photos.id, photo.id));
      updated++;
      const keys = Object.keys(patch).filter((k) => k !== "updatedAt").join(", ");
      console.log(`  ${photo.id} — set: ${keys}`);
    } catch (err) {
      console.warn(`  ${photo.id} — error:`, err instanceof Error ? err.message : err);
      failed++;
    }
  }

  console.log(`\nComplete: ${updated} updated, ${skipped} skipped, ${failed} failed`);
}

backfillExif();
