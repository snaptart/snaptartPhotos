import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { siteSettings, themes } from "@/lib/db/schema";
import type { BlockDefaults, BlockDefaultsPast } from "@/lib/puck/block-defaults";

type Stored = { blockDefaults?: BlockDefaults; blockDefaultsPast?: BlockDefaultsPast } & Record<string, unknown>;

/** The active theme preset, where block defaults live. null when the site has none yet. */
export async function loadActiveThemeRow() {
  const [settings] = await db.select().from(siteSettings).limit(1);
  if (!settings?.activeThemeId) return { settings: settings ?? null, theme: null };
  const [theme] = await db.select().from(themes).where(eq(themes.id, settings.activeThemeId)).limit(1);
  return { settings, theme: theme ?? null };
}

export async function readBlockDefaults() {
  const { theme } = await loadActiveThemeRow();
  const stored = (theme?.themeSettings ?? {}) as Stored;
  return {
    themeId: theme?.id ?? null,
    themeName: theme?.name ?? null,
    defaults: stored.blockDefaults ?? {},
    past: stored.blockDefaultsPast ?? {},
  };
}

/** Writes both maps into the active preset (creating one if the site has none). */
export async function writeBlockDefaults(defaults: BlockDefaults, past: BlockDefaultsPast) {
  const { settings, theme } = await loadActiveThemeRow();
  if (theme) {
    const stored = (theme.themeSettings ?? {}) as Stored;
    await db
      .update(themes)
      .set({ themeSettings: { ...stored, blockDefaults: defaults, blockDefaultsPast: past }, updatedAt: new Date() })
      .where(eq(themes.id, theme.id));
    return;
  }
  // No preset yet: an empty one resolves to the built-in look, so the site doesn't change.
  const [created] = await db
    .insert(themes)
    .values({ name: "Default", themeSettings: { blockDefaults: defaults, blockDefaultsPast: past } })
    .returning();
  if (settings) {
    await db.update(siteSettings).set({ activeThemeId: created.id }).where(eq(siteSettings.id, settings.id));
  } else {
    await db.insert(siteSettings).values({ activeThemeId: created.id });
  }
}
