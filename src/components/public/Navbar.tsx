import { loadSiteChrome } from "@/lib/site-chrome";
import siteConfig from "@/lib/site.config";
import { SiteHeader } from "./SiteHeader";

export async function Navbar() {
  const { items, settings, theme } = await loadSiteChrome();

  return (
    <SiteHeader
      theme={theme}
      siteTitle={settings?.siteTitle ?? siteConfig.siteName}
      logoUrl={settings?.logoUrl ?? null}
      items={items}
      instagramUrl={settings?.instagramUrl ?? null}
    />
  );
}
