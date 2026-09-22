/**
 * Applies the "Museum White" visual system as a NEW theme preset and makes it active.
 *
 * Non-destructive: your existing preset is left untouched and stays selectable in
 * Admin → Settings → Look and Feel → Theme preset. Re-running this updates the
 * Museum White preset in place rather than piling up duplicates.
 *
 *   npm run theme:museum -- --dry    # print what it would write, change nothing
 *   npm run theme:museum             # write it and switch the site over
 *
 * Requires the two theme fields added alongside this script (colorRule,
 * colorSurface) and per-role `tracking`. Typing the object as ThemeSettings means
 * the compiler catches it if the theme model and this file ever drift apart.
 */
import { config } from "dotenv";
config({ path: ".env.local" });
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { eq } from "drizzle-orm";
import { siteSettings, themes } from "./schema";
import type { ThemeSettings } from "../theme/types";

const PRESET_NAME = "Museum White";

/**
 * Contrast against the #FBFAF8 paper, measured:
 *   #1A1917 ink      16.4:1   body and headings
 *   #63605A muted     6.1:1   captions, meta, footer  (WCAG AA needs 4.5)
 *   #A4441F oxide     6.0:1   links
 * #E0DCD3 and #F2EFE9 are non-text (rules, mats), so no ratio applies.
 */
const MUSEUM_WHITE: ThemeSettings = {
  // ── Type ──────────────────────────────────────────────────────────────
  fontHeadings: "Fraunces",
  fontBody: "Instrument Sans",
  fontNavMenu: "Instrument Sans",
  fontFooter: "Instrument Sans",
  fontCaptions: "Fraunces",
  fontOverlay: "Fraunces",
  fontLabels: "Instrument Sans",

  fontStyles: {
    // italic:false matters — ROLE_DEFAULTS.headings ships italic:true, which is
    // why untouched headings currently lean.
    headings: { weight: 300, italic: false, uppercase: false, size: null, tracking: -0.02 },
    body: { weight: 400, italic: false, uppercase: false, size: null, tracking: null },
    navMenu: { weight: 500, italic: false, uppercase: true, size: 12, tracking: 0.16 },
    footer: { weight: 400, italic: false, uppercase: false, size: 12, tracking: 0.02 },
    captions: { weight: 400, italic: false, uppercase: false, size: 17, tracking: null },
    overlay: { weight: 300, italic: false, uppercase: false, size: null, tracking: -0.01 },
    labels: { weight: 500, italic: false, uppercase: true, size: 11, tracking: 0.18 },
  },

  bodyFontSize: 16,
  menuFontSize: 12,
  footerFontSize: 12,

  // ── Header / footer layout ────────────────────────────────────────────
  logoPosition: "left",
  logoSize: 40,
  menuJustify: "right",

  // ── Palette ───────────────────────────────────────────────────────────
  colorSiteBg: "#FBFAF8", // Paper
  colorHeaderBg: "#FBFAF8",
  colorFooterBg: "#FBFAF8",
  colorText: "#1A1917", // Ink
  colorAccent: "#A4441F", // Oxide — links only
  colorGalleryCaptions: "#63605A", // Muted
  colorFooterText: "#63605A",
  colorLightboxText: "#FBFAF8",
  colorHeroOverlay: "#FBFAF8",
  colorRule: "#E0DCD3", // hairlines
  colorSurface: "#F2EFE9", // form panels, image mats
};

/** These live on site_settings, not the theme. */
const LIGHTBOX = {
  lightboxMetadataFields: ["title", "location", "camera"],
  lightboxCornerRadius: 0,
  lightboxCaptionPosition: "below",
  lightboxCaptionAlignment: "left",
  lightboxFadeSpeed: "medium",
};

async function main() {
  const dry = process.argv.includes("--dry");

  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set. Is .env.local present?");
    process.exit(1);
  }

  const db = drizzle(neon(process.env.DATABASE_URL));

  const [settings] = await db.select().from(siteSettings).limit(1);
  if (!settings) {
    console.error("No site_settings row found. Run `npm run db:seed` first.");
    process.exit(1);
  }

  const allThemes = await db.select().from(themes);
  const current = allThemes.find((t) => t.id === settings.activeThemeId);
  const existing = allThemes.find((t) => t.name === PRESET_NAME);

  console.log(`Current preset: ${current ? `"${current.name}" (${current.id})` : "none"}`);
  console.log(
    existing
      ? `Will update the existing "${PRESET_NAME}" preset (${existing.id}).`
      : `Will create a new "${PRESET_NAME}" preset.`,
  );

  if (dry) {
    console.log("\n--dry — nothing written. Theme that would be applied:\n");
    console.log(JSON.stringify(MUSEUM_WHITE, null, 2));
    console.log("\nsite_settings patch:\n");
    console.log(JSON.stringify(LIGHTBOX, null, 2));
    return;
  }

  let themeId: string;
  if (existing) {
    await db
      .update(themes)
      .set({ themeSettings: MUSEUM_WHITE, updatedAt: new Date() })
      .where(eq(themes.id, existing.id));
    themeId = existing.id;
  } else {
    const [created] = await db
      .insert(themes)
      .values({ name: PRESET_NAME, themeSettings: MUSEUM_WHITE })
      .returning();
    if (!created) throw new Error("Insert returned no row.");
    themeId = created.id;
  }

  await db
    .update(siteSettings)
    .set({ ...LIGHTBOX, activeThemeId: themeId, updatedAt: new Date() })
    .where(eq(siteSettings.id, settings.id));

  console.log(`\nApplied. "${PRESET_NAME}" (${themeId}) is now the active preset.`);
  if (current && current.id !== themeId) {
    console.log(
      `To go back: Admin → Settings → Look and Feel → Theme preset → "${current.name}".`,
    );
  }
  console.log("Restart or hard-refresh the public site to pick up the new fonts.");
}

main().catch((err) => {
  console.error("Failed to apply theme:", err);
  process.exit(1);
});
