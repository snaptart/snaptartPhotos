import { Navbar } from "@/components/public/Navbar";
import { Footer } from "@/components/public/Footer";
import { db } from "@/lib/db";
import { siteSettings, themes } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { resolveTheme } from "@/lib/theme/types";
import { buildGoogleFontsUrl } from "@/lib/theme/fonts";
import { buildThemeCssVars } from "@/lib/theme/css-vars";

export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let theme = resolveTheme();

  try {
    const rows = await db.select().from(siteSettings).limit(1);
    const settings = rows[0];
    if (settings?.activeThemeId) {
      const themeRows = await db
        .select()
        .from(themes)
        .where(eq(themes.id, settings.activeThemeId))
        .limit(1);
      if (themeRows[0]) {
        theme = resolveTheme(
          themeRows[0].themeSettings as Record<string, unknown>
        );
      }
    }
  } catch {
    // DB not available — use defaults
  }

  const fontsUrl = buildGoogleFontsUrl([
    theme.fontHeadings,
    theme.fontBody,
    theme.fontNavMenu,
    theme.fontFooter,
    theme.fontCaptions,
    theme.fontOverlay,
  ]);
  const cssVars = buildThemeCssVars(theme);

  return (
    <>
      {fontsUrl && <link rel="stylesheet" href={fontsUrl} />}
      <style dangerouslySetInnerHTML={{ __html: cssVars }} />
      <div
        className="flex min-h-dvh flex-col"
        style={{
          fontFamily: "var(--theme-font-body)",
          fontSize: "var(--theme-body-font-size)",
          backgroundColor: "var(--theme-color-site-bg)",
          color: "var(--theme-color-text)",
        }}
      >
        <Navbar />
        <main className="flex-1">{children}</main>
        <Footer />
      </div>
    </>
  );
}
