import { loadSiteChrome } from "@/lib/site-chrome";
import siteConfig from "@/lib/site.config";
import { FooterShell } from "./FooterShell";
import { SiteFooter } from "./SiteFooter";

/**
 * The site footer, as Look → Header & footer sets it: a bar, centred, in
 * columns or the © line alone (SiteFooter), or the floating "i" button.
 */
export async function Footer() {
  const { items, settings, theme } = await loadSiteChrome();
  if (!settings) return null;

  if (theme.footerStyle === "floating") {
    return (
      <FooterShell
        footerText={settings.footerText}
        contactEmail={settings.contactEmail}
        alignment={settings.footerAlignment}
      />
    );
  }

  return (
    <SiteFooter
      theme={theme}
      siteTitle={settings.siteTitle ?? siteConfig.siteName}
      logoUrl={settings.logoUrl}
      tagline={settings.tagline}
      footerText={settings.footerText}
      contactEmail={settings.contactEmail}
      instagramUrl={settings.instagramUrl}
      items={items}
    />
  );
}
