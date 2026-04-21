import { config } from "dotenv";
config({ path: ".env.local" });

import { db } from "@/lib/db";
import { photos, galleries } from "@/lib/db/schema";

async function main() {
  const allPhotos = await db.select().from(photos);
  const allGalleries = await db.select().from(galleries);
  const gMap = new Map(allGalleries.map((g) => [g.id, g.slug]));

  // Group by filename
  const byFilename = new Map<string, typeof allPhotos>();
  for (const p of allPhotos) {
    if (!p.filename) continue;
    const key = p.filename.toLowerCase();
    if (!byFilename.has(key)) byFilename.set(key, []);
    byFilename.get(key)!.push(p);
  }

  console.log(`Total photos: ${allPhotos.length}`);
  console.log(`Unique filenames: ${byFilename.size}\n`);

  const dups = [...byFilename.entries()].filter(([, rows]) => rows.length > 1);
  if (dups.length === 0) {
    console.log("No duplicate filenames.");
  } else {
    console.log(`${dups.length} filenames appear more than once:\n`);
    for (const [fn, rows] of dups) {
      console.log(`  ${fn}  (×${rows.length})`);
      for (const r of rows) {
        console.log(`    - gallery=${gMap.get(r.galleryId)}  title="${r.title ?? "(none)"}"  loc="${r.location?.slice(0, 60) ?? "(empty)"}..."`);
      }
    }
  }
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
