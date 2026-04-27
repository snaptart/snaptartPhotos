import { config } from "dotenv";
config({ path: ".env.local" });
import { neon } from "@neondatabase/serverless";

// Backfills the gallery_photos junction from the legacy photos.gallery_id / photos.position columns.
// Idempotent: ON CONFLICT DO NOTHING means re-running is safe.
// Run AFTER db:push has created the gallery_photos table and BEFORE the legacy columns are dropped.
async function backfillGalleryPhotos() {
  const sql = neon(process.env.DATABASE_URL!);

  const [{ count: photoCount }] = await sql`
    SELECT COUNT(*)::int AS count FROM photos
  ` as { count: number }[];

  const [{ count: junctionBefore }] = await sql`
    SELECT COUNT(*)::int AS count FROM gallery_photos
  ` as { count: number }[];

  console.log(`photos: ${photoCount}`);
  console.log(`gallery_photos before: ${junctionBefore}`);

  const inserted = await sql`
    INSERT INTO gallery_photos (gallery_id, photo_id, position)
    SELECT gallery_id, id, position
    FROM photos
    WHERE gallery_id IS NOT NULL
    ON CONFLICT (gallery_id, photo_id) DO NOTHING
    RETURNING photo_id
  ` as { photo_id: string }[];

  const [{ count: junctionAfter }] = await sql`
    SELECT COUNT(*)::int AS count FROM gallery_photos
  ` as { count: number }[];

  console.log(`inserted: ${inserted.length}`);
  console.log(`gallery_photos after: ${junctionAfter}`);

  if (junctionAfter !== photoCount) {
    console.warn(
      `WARNING: gallery_photos (${junctionAfter}) does not equal photos (${photoCount}). ` +
        `Expected only if some photos have NULL gallery_id; otherwise investigate.`
    );
  } else {
    console.log("Counts match. Backfill complete.");
  }
}

backfillGalleryPhotos().catch((err) => {
  console.error("Backfill failed:", err);
  process.exit(1);
});
