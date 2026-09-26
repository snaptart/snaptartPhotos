import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import type { ThemeSettings } from "@/lib/theme/types";
import { parseLinks } from "@/lib/parseLinks";
import { fontRole } from "@/lib/theme/role-style";
import { chromeContainer } from "./SiteHeader";

export type FooterMenuItem = { id: string; label: string; url: string; targetType: string };

export interface SiteFooterProps {
  theme: ThemeSettings;
  siteTitle: string;
  logoUrl: string | null;
  tagline: string | null;
  footerText: string | null;
  contactEmail: string | null;
  instagramUrl: string | null;
  items: FooterMenuItem[];
}

type FooterLink = { key: string; label: string; href: string; external: boolean };

/**
 * The footer as Look → Header & footer sets it: a bar, centred, in columns, or
 * the © line alone (the floating "i" button is FooterShell). The public Footer
 * and the admin's theme preview both draw it.
 */
export function SiteFooter({ theme, siteTitle, logoUrl, tagline, footerText, contactEmail, instagramUrl, items }: SiteFooterProps) {
  const layout = theme.footerStyle === "floating" ? "bar" : theme.footerStyle;
  const textStyle: CSSProperties = {
    ...fontRole("footer"),
    fontSize: "var(--theme-font-footer-size, var(--theme-footer-font-size))",
    color: "var(--theme-color-footer-text)",
  };

  const brand: ReactNode =
    theme.footerBrand === "none" ? null : theme.footerBrand === "logo" && logoUrl ? (
      <Link href="/" className="inline-block">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={logoUrl} alt={siteTitle} style={{ height: theme.footerLogoHeight, width: "auto", display: "block" }} />
      </Link>
    ) : (
      <Link
        href="/"
        style={{
          fontFamily: "var(--theme-font-headings)",
          fontSize: theme.footerNameSize,
          fontWeight: theme.wordmarkWeight,
          textTransform: theme.wordmarkUppercase ? "uppercase" : "none",
          letterSpacing: `${theme.wordmarkTracking}em`,
          color: "var(--theme-color-text)",
        }}
      >
        {siteTitle}
      </Link>
    );

  const showTagline = theme.footerShowTagline && !!tagline;
  const showText = theme.footerShowText && !!footerText;

  const pages: FooterLink[] = theme.footerShowMenu
    ? items.map((i) => ({ key: i.id, label: i.label, href: i.url, external: i.targetType === "external" }))
    : [];
  const contact: FooterLink[] = [
    ...(theme.footerShowEmail && contactEmail
      ? [{ key: "email", label: "Email", href: `mailto:${contactEmail}`, external: false }]
      : []),
    ...(theme.footerShowSocial && instagramUrl
      ? [{ key: "instagram", label: "Instagram", href: instagramUrl, external: true }]
      : []),
  ];

  const link = (l: FooterLink) => {
    // data-text-style: the Typography preview can point the links out.
    const props = { className: "site-footer-link theme-text-label py-3", "data-text-style": "label" };
    if (l.external) {
      return (
        <a key={l.key} href={l.href} {...props} target="_blank" rel="noopener noreferrer">
          {l.label}
        </a>
      );
    }
    return l.href.startsWith("mailto:") ? (
      <a key={l.key} href={l.href} {...props}>
        {l.label}
      </a>
    ) : (
      <Link key={l.key} href={l.href} {...props}>
        {l.label}
      </Link>
    );
  };
  const text = (value: string, className = "") => (
    <p className={`break-words ${className}`} style={textStyle}>
      {parseLinks(value)}
    </p>
  );

  let body: ReactNode;
  if (layout === "minimal") {
    body = showText ? <div className="text-center">{text(footerText!)}</div> : null;
  } else if (layout === "centered") {
    const links = [...pages, ...contact];
    body = (
      <div className="flex flex-col items-center gap-5 text-center">
        {(brand || showTagline) && (
          <div>
            {brand}
            {showTagline && text(tagline!, "mt-2.5")}
          </div>
        )}
        {links.length > 0 && <nav aria-label="Footer" className="-my-3 flex flex-wrap justify-center gap-x-8 gap-y-1">{links.map(link)}</nav>}
        {showText && text(footerText!)}
      </div>
    );
  } else if (layout === "columns") {
    const columns = [pages, contact].filter((c) => c.length > 0);
    body = (
      <>
        <div className="grid gap-8 md:grid-cols-[2fr_1fr_1fr] md:gap-12">
          <div className="min-w-0">
            {brand}
            {showTagline && text(tagline!, brand ? "mt-2.5" : "")}
          </div>
          {columns.map((c, i) => (
            <nav key={i} aria-label={i === 0 && pages.length ? "Footer" : "Contact"} className="-my-2 flex flex-col items-start">
              {c.map((l) => (
                <span key={l.key} className="py-0.5">
                  {link(l)}
                </span>
              ))}
            </nav>
          ))}
        </div>
        {showText && (
          <div className="mt-10 pt-6" style={{ borderTop: "1px solid var(--theme-color-rule)" }}>
            {text(footerText!)}
          </div>
        )}
      </>
    );
  } else {
    // The bar. Without a tagline, the footer text sits under the name instead of at the end.
    const links = [...pages, ...contact];
    const under = showTagline ? tagline : showText ? footerText : null;
    const end = showTagline && showText ? footerText : null;
    body = (
      <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between md:gap-12">
        {(brand || under) && (
          <div className="min-w-0">
            {brand}
            {under && text(under, brand ? "mt-2.5" : "")}
          </div>
        )}
        {links.length > 0 && <nav aria-label="Footer" className="-my-3 flex flex-wrap gap-x-8 gap-y-1 md:justify-end">{links.map(link)}</nav>}
        {end && text(end, "md:text-right")}
      </div>
    );
  }

  if (!body) return null;
  return (
    <footer className="site-footer" data-link-hover={theme.footerLinkHover}>
      <div className={`site-footer-inner ${chromeContainer(theme.footerWidth)}`}>{body}</div>
    </footer>
  );
}
