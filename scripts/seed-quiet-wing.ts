/**
 * One-off seed: adds a "Quiet Wing" theme preset to the `themes` table.
 * Safe to re-run — skips insert if a preset with that name already exists.
 *
 * Run: npx tsx scripts/seed-quiet-wing.ts
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { db } from "@/lib/db";
import { themes } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import type { ThemeSettings } from "@/lib/theme/types";

const QUIET_WING: Partial<ThemeSettings> = {
  fontHeadings: "EB Garamond",
  fontBody: "EB Garamond",
  fontNavMenu: "EB Garamond",
  fontFooter: "EB Garamond",
  fontCaptions: "EB Garamond",
  fontOverlay: "EB Garamond",
  colorSiteBg: "#ffffff",
  colorHeaderBg: "#ffffff",
  colorFooterBg: "#ffffff",
  colorFooterText: "#6b6258",
  colorAccent: "#b8824a",
  colorText: "#2a2620",
  colorGalleryCaptions: "#6b6258",
  colorLightboxText: "#ffffff",
  colorHeroOverlay: "#2a2620",
};

async function main() {
  const existing = await db
    .select()
    .from(themes)
    .where(eq(themes.name, "Quiet Wing"));

  if (existing.length > 0) {
    console.log(`Quiet Wing already exists (id ${existing[0].id}). Skipping.`);
    process.exit(0);
  }

  const [inserted] = await db
    .insert(themes)
    .values({ name: "Quiet Wing", themeSettings: QUIET_WING })
    .returning();

  console.log(`Seeded Quiet Wing theme with id ${inserted.id}.`);
  console.log("Activate it via /admin/settings/look.");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
