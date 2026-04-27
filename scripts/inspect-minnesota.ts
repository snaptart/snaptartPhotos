import { config } from "dotenv";
config({ path: ".env.local" });

import { db } from "@/lib/db";
import { galleries } from "@/lib/db/schema";
import { selectPhotosForGallery } from "@/lib/db/photo-queries";

async function main() {
  const gs = await db.select().from(galleries);
  console.log("Galleries:");
  for (const g of gs) console.log(`  ${g.slug}  →  ${g.id}  (${g.title})`);

  const mn = gs.find((g) => g.slug.toLowerCase().includes("minnesota"));
  if (!mn) {
    console.log("\nNo Minnesota gallery found by slug; trying by title...");
    return;
  }

  const rows = await selectPhotosForGallery(mn.id);
  console.log(`\n${mn.title} (slug=${mn.slug}) has ${rows.length} photos:\n`);
  for (const p of rows) {
    console.log(`  - ${p.title ?? "(no title)"}  |  filename=${p.filename}`);
    console.log(`      location: ${p.location ?? "(empty)"}`);
    console.log(`      lat/lng : ${p.latitude ?? "-"} / ${p.longitude ?? "-"}`);
    console.log(`      tags    : ${JSON.stringify(p.tags)}`);
  }
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
