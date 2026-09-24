import Link from "next/link";
import { loadSiteChrome } from "@/lib/site-chrome";
import { parseLinks } from "@/lib/parseLinks";
import { PAGE_CONTAINER } from "@/lib/theme/layout";
import { fontRole } from "@/lib/theme/role-style";
import siteConfig from "@/lib/site.config";
import { FooterShell } from "./FooterShell";

/**
 * The site footer. By default the design's bar: the wordmark with the tagline
 * (or, without one, the footer text) on the left, the menu's links, and the
 * footer text as the © line on the right; stacking on phones. Look → Footer can
 * switch it to the floating "i" button instead.
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

  const siteTitle = settings.siteTitle ?? siteConfig.siteName;
  const linkClass = "theme-text-label py-3 transition-opacity hover:opacity-70";
  const linkStyle = { color: "var(--theme-color-footer-text)" };
  const textStyle = {
    ...fontRole("footer"),
    fontSize: "var(--theme-font-footer-size, var(--theme-footer-font-size))",
    color: "var(--theme-color-footer-text)",
  };

  return (
    <footer
      className="border-t"
      style={{ borderColor: "var(--theme-color-rule)", backgroundColor: "var(--theme-color-footer-bg)" }}
    >
      <div className={`${PAGE_CONTAINER} flex flex-col gap-6 py-8 md:flex-row md:items-end md:justify-between md:gap-12 md:pb-[52px] md:pt-11`}>
        <div className="min-w-0">
          <Link
            href="/"
            style={{
              fontFamily: "var(--theme-font-headings)",
              fontSize: 16,
              fontWeight: theme.wordmarkWeight,
              textTransform: theme.wordmarkUppercase ? "uppercase" : "none",
              letterSpacing: `${theme.wordmarkTracking}em`,
              color: "var(--theme-color-text)",
            }}
          >
            {siteTitle}
          </Link>
          {(settings.tagline || settings.footerText) && (
            <p className="mt-2.5 break-words" style={textStyle}>
              {parseLinks(settings.tagline || settings.footerText || "")}
            </p>
          )}
        </div>

        {(items.length > 0 || settings.instagramUrl || settings.contactEmail) && (
          <nav aria-label="Footer" className="-my-3 flex flex-wrap gap-x-8 gap-y-1 md:justify-end">
            {items.map((item) => (
              <Link
                key={item.id}
                href={item.url}
                className={linkClass}
                style={linkStyle}
                {...(item.targetType === "external" ? { target: "_blank", rel: "noopener noreferrer" } : {})}
              >
                {item.label}
              </Link>
            ))}
            {settings.contactEmail && (
              <a href={`mailto:${settings.contactEmail}`} className={linkClass} style={linkStyle}>
                Email
              </a>
            )}
            {settings.instagramUrl && (
              <a href={settings.instagramUrl} target="_blank" rel="noopener noreferrer" className={linkClass} style={linkStyle}>
                Instagram
              </a>
            )}
          </nav>
        )}

        {/* With a tagline under the name, the footer text sits at the end as the © line. */}
        {settings.tagline && settings.footerText && (
          <p className="break-words md:text-right" style={textStyle}>
            {parseLinks(settings.footerText)}
          </p>
        )}
      </div>
    </footer>
  );
}
