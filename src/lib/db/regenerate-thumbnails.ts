import { config } from "dotenv";
config({ path: ".env.local" });
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { eq } from "drizzle-orm";
import { photos } from "./schema";
import { put } from "@vercel/blob";
import sharp from "sharp";

const THUMBNAIL_WIDTH = 800;

async function regenerateThumbnails() {
  const sql = neon(process.env.DATABASE_URL!);
  const db = drizzle(sql);

  const allPhotos = await db.select().from(photos);
  console.log(`Found ${allPhotos.length} photos to process`);

  let success = 0;
  let skipped = 0;
  let failed = 0;

  for (const photo of allPhotos) {
    // Skip if thumbnail already differs from the main URL
    if (photo.thumbnailUrl && photo.thumbnailUrl !== photo.url && photo.thumbnailUrl !== photo.blobUrl) {
      console.log(`  Skipping ${photo.id} — already has a separate thumbnail`);
      skipped++;
      continue;
    }

    try {
      console.log(`  Processing ${photo.id} (${photo.title || photo.filename || "untitled"})...`);

      // Fetch the original image
      const res = await fetch(photo.url);
      if (!res.ok) {
        console.log(`    Failed to fetch image: ${res.status}`);
        failed++;
        continue;
      }

      const buffer = Buffer.from(await res.arrayBuffer());

      // Generate thumbnail
      const thumbnailBuffer = await sharp(buffer)
        .resize({ width: THUMBNAIL_WIDTH, withoutEnlargement: true })
        .jpeg({ quality: 80 })
        .toBuffer();

      // Upload thumbnail to Vercel Blob
      const timestamp = Date.now();
      const thumbFilename = `galleries/thumbs/${timestamp}-${photo.id}.jpg`;
      const thumbBlob = await put(thumbFilename, thumbnailBuffer, {
        access: "public",
        contentType: "image/jpeg",
      });

      // Update the database
      await db
        .update(photos)
        .set({ thumbnailUrl: thumbBlob.url })
        .where(eq(photos.id, photo.id));

      console.log(`    Done — thumbnail: ${thumbBlob.url}`);
      success++;
    } catch (err) {
      console.log(`    Error: ${err}`);
      failed++;
    }
  }

  console.log(`\nComplete: ${success} generated, ${skipped} skipped, ${failed} failed`);
}

regenerateThumbnails();
