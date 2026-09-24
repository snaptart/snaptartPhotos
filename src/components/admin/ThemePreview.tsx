"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { TEXT_STYLE_LABELS, type TextStyleKey, type ThemeSettings } from "@/lib/theme/types";
import { buildGoogleFontsUrl } from "@/lib/theme/fonts";
import { buildThemeCssVars } from "@/lib/theme/css-vars";
import { fontRole } from "@/lib/theme/role-style";
import { parseLinks } from "@/lib/parseLinks";

interface ThemePreviewProps {
  theme: ThemeSettings;
  siteTitle: string;
  logoUrl: string;
  /** Text styles to point out: outlined and labelled wherever they appear. */
  highlight?: TextStyleKey[];
}

type MenuItem = { id: string; label: string };
type Collection = { id: string; title: string; photoCount?: number; coverImageUrl: string | null; firstPhotoUrl?: string | null };
type SiteBits = { tagline: string | null; footerText: string | null; contactEmail: string | null; instagramUrl: string | null };

/** The page is laid out at this width, then shrunk to fit the preview column. */
const PAGE_WIDTH = 960;
const SCOPE = "theme-preview-scope";

/**
 * A small public page drawn with the site's own CSS — the same variables and
 * text-style classes the public layout emits, scoped to this box — so what
 * the preview shows is what the site does: your menu, your collections, your
 * header and footer settings, the seven text styles and every colour.
 */
export default function ThemePreview({ theme, siteTitle, logoUrl, highlight = [] }: ThemePreviewProps) {
  const boxRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.3);
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [site, setSite] = useState<SiteBits>({ tagline: null, footerText: null, contactEmail: null, instagramUrl: null });

  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setScale(entry.contentRect.width / PAGE_WIDTH));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    Promise.all([
      fetch("/api/menu-items").then((r) => (r.ok ? r.json() : [])),
      fetch("/api/galleries").then((r) => (r.ok ? r.json() : [])),
      fetch("/api/settings").then((r) => (r.ok ? r.json() : null)),
    ])
      .then(([m, g, s]) => {
        setMenu(Array.isArray(m) ? m : []);
        setCollections(Array.isArray(g) ? g.slice(0, 3) : []);
        if (s) setSite({ tagline: s.tagline, footerText: s.footerText, contactEmail: s.contactEmail, instagramUrl: s.instagramUrl });
      })
      .catch(() => {});
  }, []);

  // Bring the first highlighted text into view in the preview column.
  const highlightKey = highlight.join(",");
  useEffect(() => {
    if (!highlightKey) return;
    const first = boxRef.current?.querySelector(`[data-text-style="${highlightKey.split(",")[0]}"]`);
    first?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [highlightKey]);

  // The page is zoomed down, so the outline and label are drawn larger to come out at their real size.
  const px = (n: number) => `${(n / Math.max(scale, 0.05)).toFixed(2)}px`;
  const highlightCss = highlight
    .map(
      (key) => `.${SCOPE} [data-text-style="${key}"] {
  outline: ${px(2)} solid #c2410c;
  outline-offset: ${px(3)};
  position: relative;
}
.${SCOPE} [data-text-style="${key}"]::after {
  content: ${JSON.stringify(TEXT_STYLE_LABELS[key])};
  position: absolute;
  left: ${px(-3)};
  bottom: 100%;
  margin-bottom: ${px(4)};
  padding: ${px(1)} ${px(5)};
  background: #c2410c;
  color: #fff;
  font: 500 ${px(10)}/1.3 ui-sans-serif, system-ui, sans-serif;
  letter-spacing: 0;
  text-transform: none;
  white-space: nowrap;
  z-index: 5;
}`,
    )
    .join("\n");

  const fontsUrl = buildGoogleFontsUrl([
    theme.fontHeadings,
    theme.fontBody,
    theme.fontNavMenu,
    theme.fontFooter,
    theme.fontCaptions,
    theme.fontOverlay,
    theme.fontLabels,
  ]);

  const menuItems = menu.length ? menu : [{ id: "a", label: "Collections" }, { id: "b", label: "About" }, { id: "c", label: "Contact" }];
  const wordmark = theme.wordmarkSize ?? Math.round(theme.logoSize * 0.6);
  const logo = logoUrl ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={logoUrl} alt="" style={{ height: theme.logoSize, width: "auto", display: "block" }} />
  ) : (
    <span
      style={{
        fontFamily: "var(--theme-font-headings)",
        fontSize: wordmark,
        fontWeight: theme.wordmarkWeight,
        textTransform: theme.wordmarkUppercase ? "uppercase" : "none",
        letterSpacing: `${theme.wordmarkTracking}em`,
      }}
    >
      {siteTitle || "Site name"}
    </span>
  );
  const menuEl = (
    <div
      style={{
        display: "flex",
        gap: 32,
        ...fontRole("navMenu", { tracking: "0.025em" }),
        fontSize: `var(--theme-font-nav-menu-size, ${theme.menuFontSize}px)`,
      }}
    >
      {menuItems.map((m, i) => (
        // The first item shows how the current page is marked.
        <span key={m.id} style={{ padding: "6px 0", borderBottom: `1px solid ${i === 0 ? "currentColor" : "transparent"}` }}>
          {m.label}
        </span>
      ))}
    </div>
  );
  const slots: Record<"left" | "center" | "right", React.ReactNode[]> = { left: [], center: [], right: [] };
  slots[theme.logoPosition].push(<div key="logo">{logo}</div>);
  slots[theme.menuJustify].push(<div key="menu">{menuEl}</div>);

  const pad = "0 64px";
  const footerText: CSSProperties = {
    ...fontRole("footer"),
    fontSize: "var(--theme-font-footer-size, var(--theme-footer-font-size))",
    color: "var(--theme-color-footer-text)",
  };
  const footerLinks = [...menuItems.map((m) => m.label), ...(site.contactEmail ? ["Email"] : []), ...(site.instagramUrl ? ["Instagram"] : [])];

  return (
    <div ref={boxRef} className="overflow-hidden rounded-lg border border-neutral-300 shadow-sm">
      {fontsUrl && <link rel="stylesheet" href={fontsUrl} />}
      <style dangerouslySetInnerHTML={{ __html: buildThemeCssVars(theme, { scope: `.${SCOPE}` }) + highlightCss }} />
      <div
        className={SCOPE}
        style={{
          width: PAGE_WIDTH,
          zoom: scale,
          position: "relative",
          ...fontRole("body"),
          fontSize: "var(--theme-body-font-size)",
          backgroundColor: "var(--theme-color-site-bg)",
          color: "var(--theme-color-text)",
          textAlign: "left",
        }}
      >
        {/* Header */}
        <header style={{ backgroundColor: "var(--theme-color-header-bg)", borderBottom: "1px solid var(--theme-color-rule)" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center", padding: "20px 64px" }}>
            <div style={{ justifySelf: "start", display: "flex", gap: 16, alignItems: "center" }}>{slots.left}</div>
            <div style={{ justifySelf: "center", display: "flex", gap: 16, alignItems: "center" }}>{slots.center}</div>
            <div style={{ justifySelf: "end", display: "flex", gap: 16, alignItems: "center" }}>{slots.right}</div>
          </div>
        </header>

        {/* A page intro and a collection index, in the text styles */}
        <main style={{ padding: "64px 64px 72px" }}>
          <div className="theme-text-label" data-text-style="label">Collections</div>
          <h1 className="theme-text-display" data-text-style="display" style={{ margin: "18px 0 0", maxWidth: 640 }}>
            Photographs, grouped by place.
          </h1>
          <p className="theme-text-lead" data-text-style="lead" style={{ margin: "22px 0 0", maxWidth: 560 }}>
            Each collection opens onto a full set, with the place and the camera for every photograph.
          </p>
          <p className="theme-text-body" data-text-style="body" style={{ margin: "14px 0 0", maxWidth: 560 }}>
            Body text reads like this, and{" "}
            <span style={{ color: "var(--theme-color-accent)", textDecoration: "underline" }}>a link</span> in the
            accent colour.
          </p>

          <div style={{ marginTop: 44, display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 28 }}>
            {(collections.length ? collections : [null, null, null]).map((c, i) => {
              const src = c ? c.coverImageUrl || c.firstPhotoUrl : null;
              return (
                <div key={c?.id ?? i}>
                  <div style={{ aspectRatio: "4 / 5", overflow: "hidden", backgroundColor: "var(--theme-color-surface)" }}>
                    {src && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={src} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                    )}
                  </div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "baseline",
                      justifyContent: "space-between",
                      gap: 12,
                      marginTop: 14,
                      paddingTop: 12,
                      borderTop: "1px solid var(--theme-color-rule)",
                    }}
                  >
                    <span className="theme-text-collection-title" data-text-style="collectionTitle">{c?.title ?? "Collection"}</span>
                    <span className="theme-text-meta" data-text-style="meta" style={{ flexShrink: 0 }}>
                      {String(c?.photoCount ?? 12).padStart(2, "0")} photographs
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ marginTop: 36, display: "flex", gap: 28, alignItems: "flex-end" }}>
            <div>
              <div className="theme-text-photo-title" data-text-style="photoTitle">A photograph&apos;s title</div>
              <div className="theme-text-meta" data-text-style="meta" style={{ marginTop: 4 }}>
                Place · September 2020
              </div>
            </div>
            <div
              style={{
                marginLeft: "auto",
                padding: "10px 16px",
                background: "linear-gradient(135deg, #8a8274, #3f3b33)",
                color: "var(--theme-color-hero-overlay)",
                ...fontRole("overlay"),
              }}
            >
              Hero overlay text
            </div>
          </div>
        </main>

        {/* Footer, as Look → Footer sets it */}
        {theme.footerStyle === "floating" ? (
          <div style={{ position: "relative", height: 72 }}>
            <div
              style={{
                position: "absolute",
                right: 16,
                bottom: 16,
                width: 44,
                height: 44,
                borderRadius: "50%",
                border: "1px solid var(--theme-color-rule)",
                backgroundColor: "var(--theme-color-surface)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontStyle: "italic",
                fontFamily: "serif",
              }}
            >
              i
            </div>
          </div>
        ) : (
          <footer style={{ borderTop: "1px solid var(--theme-color-rule)", backgroundColor: "var(--theme-color-footer-bg)" }}>
            <div style={{ padding: "40px 64px 48px", display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 40 }}>
              <div>
                <div
                  style={{
                    fontFamily: "var(--theme-font-headings)",
                    fontSize: 16,
                    fontWeight: theme.wordmarkWeight,
                    textTransform: theme.wordmarkUppercase ? "uppercase" : "none",
                    letterSpacing: `${theme.wordmarkTracking}em`,
                  }}
                >
                  {siteTitle || "Site name"}
                </div>
                {(site.tagline || site.footerText) && (
                  <p style={{ ...footerText, margin: "10px 0 0" }}>{parseLinks(site.tagline || site.footerText || "")}</p>
                )}
              </div>
              <div style={{ display: "flex", gap: 32 }}>
                {footerLinks.map((l) => (
                  <span key={l} className="theme-text-label" data-text-style="label" style={{ color: "var(--theme-color-footer-text)" }}>
                    {l}
                  </span>
                ))}
              </div>
              {site.tagline && site.footerText && <p style={{ ...footerText, margin: 0 }}>{parseLinks(site.footerText)}</p>}
            </div>
          </footer>
        )}
        {/* Nothing in a preview is a real link. */}
        <div style={{ position: "absolute", inset: 0 }} aria-hidden="true" />
      </div>
    </div>
  );
}
