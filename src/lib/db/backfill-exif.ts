import { config } from "dotenv";
config({ path: ".env.local" });
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { eq, inArray, or } from "drizzle-orm";
import { galleries, galleryPhotos, photos } from "./schema";
import { extractPhotoMetadata } from "../photo-exif";

const FORCE = process.argv.includes("--force");
const ONLY_ID = process.argv.find((a) => a.startsWith("--id="))?.slice(5);
// Restricts the run to one gallery's photos, by slug or id. A photo in several
// galleries is still one row, so this narrows which rows get touched, not which
// membership gets updated.
const ONLY_GALLERY = process.argv.find((a) => a.startsWith("--gallery="))?.slice(10);
// Narrows the run to taken_at, leaving hand-edited titles/tags/locations alone.
// Combine with --force to rewrite dates that are already set (e.g. to repair rows
// written before takenAt was pinned to UTC-of-wall-clock).
const DATES_ONLY = process.argv.includes("--dates-only");

function isUuid(v: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
}

async function backfillExif() {
  const sql = neon(process.env.DATABASE_URL!);
  const db = drizzle(sql);

  let all;
  if (ONLY_ID) {
    all = await db.select().from(photos).where(eq(photos.id, ONLY_ID));
  } else if (ONLY_GALLERY) {
    // Accept either the slug (what the URL shows) or the uuid. `slug` is unique, so
    // matching on both columns at once can only ever resolve to one gallery — but the
    // id comparison is only added when the argument actually looks like a uuid, since
    // Postgres errors outright when casting an arbitrary string to uuid.
    const [gallery] = await db
      .select({ id: galleries.id, title: galleries.title, slug: galleries.slug })
      .from(galleries)
      .where(
        isUuid(ONLY_GALLERY)
          ? or(eq(galleries.slug, ONLY_GALLERY), eq(galleries.id, ONLY_GALLERY))
          : eq(galleries.slug, ONLY_GALLERY),
      );
    if (!gallery) {
      console.error(`No gallery matches "${ONLY_GALLERY}" (looked up by slug and id).`);
      process.exitCode = 1;
      return;
    }
    const memberships = await db
      .select({ photoId: galleryPhotos.photoId })
      .from(galleryPhotos)
      .where(eq(galleryPhotos.galleryId, gallery.id));
    const ids = memberships.map((m) => m.photoId);
    all = ids.length
      ? await db.select().from(photos).where(inArray(photos.id, ids))
      : [];
    console.log(`Gallery "${gallery.title}" (${gallery.slug}) — ${ids.length} photo${ids.length === 1 ? "" : "s"}`);
  } else {
    all = await db.select().from(photos);
  }

  const mode = [DATES_ONLY ? "dates only" : null, FORCE ? "force" : null].filter(Boolean).join(", ");
  console.log(`Found ${all.length} photo${all.length === 1 ? "" : "s"} to process${mode ? ` (${mode})` : ""}`);

  let updated = 0;
  let skipped = 0;
  let failed = 0;

  for (const photo of all) {
    // The cameraSettings shortcut means "this row has already been through EXIF";
    // a dates-only run is precisely for rows in that state, so it ignores it.
    if (!FORCE && !DATES_ONLY && photo.cameraSettings) {
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
      if (!DATES_ONLY) {
        if (FORCE || photo.latitude == null) {
          if (meta.latitude !== null) patch.latitude = meta.latitude;
        }
        if (FORCE || photo.longitude == null) {
          if (meta.longitude !== null) patch.longitude = meta.longitude;
        }
        if (FORCE || !photo.location) {
          if (meta.location) patch.location = meta.location;
        }
        if (FORCE || !photo.title) {
          if (meta.title) patch.title = meta.title;
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
      }

      if (Object.keys(patch).length === 0) {
        skipped++;
        continue;
      }

      patch.updatedAt = new Date();
      await db.update(photos).set(patch).where(eq(photos.id, photo.id));
      updated++;
      const keys = Object.keys(patch).filter((k) => k !== "updatedAt").join(", ");
      const dateChange = patch.takenAt instanceof Date
        ? ` (${photo.takenAt?.toISOString() ?? "null"} → ${patch.takenAt.toISOString()})`
        : "";
      console.log(`  ${photo.id} — set: ${keys}${dateChange}`);
    } catch (err) {
      console.warn(`  ${photo.id} — error:`, err instanceof Error ? err.message : err);
      failed++;
    }
  }

  console.log(`\nComplete: ${updated} updated, ${skipped} skipped, ${failed} failed`);
}

backfillExif();
