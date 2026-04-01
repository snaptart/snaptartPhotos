"use client";

import type { ThemeSettings } from "@/lib/theme/types";
import { buildGoogleFontsUrl, getFontFallback } from "@/lib/theme/fonts";

interface ThemePreviewProps {
  theme: ThemeSettings;
  siteTitle: string;
  logoUrl: string;
}

export default function ThemePreview({ theme, siteTitle, logoUrl }: ThemePreviewProps) {
  const fontsUrl = buildGoogleFontsUrl([
    theme.fontHeadings,
    theme.fontBody,
    theme.fontNavMenu,
    theme.fontFooter,
    theme.fontCaptions,
    theme.fontOverlay,
  ]);

  const justifyMap: Record<string, string> = {
    left: "flex-start",
    center: "center",
    right: "flex-end",
  };

  return (
    <div className="overflow-hidden rounded-lg border border-neutral-300 shadow-sm">
      {fontsUrl && <link rel="stylesheet" href={fontsUrl} />}

      {/* Mini Navbar */}
      <div
        className="border-b border-neutral-200 px-4 py-3"
        style={{ backgroundColor: theme.colorHeaderBg }}
      >
        <div
          className="grid items-center"
          style={{
            gridTemplateColumns: "1fr auto 1fr",
            color: theme.colorText,
          }}
        >
          <div style={{ justifySelf: theme.logoPosition === "left" ? "start" : "start" }}>
            {theme.logoPosition === "left" && (
              logoUrl ? (
                <img src={logoUrl} alt={siteTitle} style={{ height: `${theme.logoSize * 0.5}px` }} />
              ) : (
                <span
                  style={{
                    fontFamily: getFontFallback(theme.fontHeadings),
                    fontSize: `${theme.logoSize * 0.3}px`,
                    fontWeight: 300,
                    letterSpacing: "0.1em",
                  }}
                >
                  {siteTitle || "Site Title"}
                </span>
              )
            )}
          </div>
          <div style={{ justifySelf: "center" }}>
            {theme.logoPosition === "center" && (
              logoUrl ? (
                <img src={logoUrl} alt={siteTitle} style={{ height: `${theme.logoSize * 0.5}px` }} />
              ) : (
                <span
                  style={{
                    fontFamily: getFontFallback(theme.fontHeadings),
                    fontSize: `${theme.logoSize * 0.3}px`,
                    fontWeight: 300,
                    letterSpacing: "0.1em",
                  }}
                >
                  {siteTitle || "Site Title"}
                </span>
              )
            )}
          </div>
          <div
            className="flex gap-3"
            style={{
              justifySelf: "end",
              fontFamily: getFontFallback(theme.fontNavMenu),
              fontSize: `${theme.menuFontSize * 0.75}px`,
              justifyContent: justifyMap[theme.menuJustify],
            }}
          >
            {theme.logoPosition === "right" && (
              logoUrl ? (
                <img src={logoUrl} alt={siteTitle} style={{ height: `${theme.logoSize * 0.5}px` }} className="mr-4" />
              ) : (
                <span
                  className="mr-4"
                  style={{
                    fontFamily: getFontFallback(theme.fontHeadings),
                    fontSize: `${theme.logoSize * 0.3}px`,
                    fontWeight: 300,
                    letterSpacing: "0.1em",
                  }}
                >
                  {siteTitle || "Site Title"}
                </span>
              )
            )}
            <span style={{ opacity: 0.7 }}>Gallery</span>
            <span style={{ opacity: 0.7 }}>About</span>
            <span style={{ opacity: 0.7 }}>Contact</span>
          </div>
        </div>
      </div>

      {/* Sample Content */}
      <div
        className="px-6 py-6"
        style={{
          backgroundColor: theme.colorSiteBg,
          color: theme.colorText,
        }}
      >
        <h2
          className="mb-2"
          style={{
            fontFamily: getFontFallback(theme.fontHeadings),
            fontSize: "18px",
            fontWeight: 400,
          }}
        >
          Sample Heading
        </h2>
        <p
          className="mb-3"
          style={{
            fontFamily: getFontFallback(theme.fontBody),
            fontSize: "13px",
            lineHeight: 1.6,
          }}
        >
          This is sample body text showing how your chosen font and colors look together.
          Photography from Minnesota, France, and other beautiful places.
        </p>
        <div className="flex gap-3">
          <div className="h-16 w-24 rounded bg-neutral-300" />
          <div className="h-16 w-24 rounded bg-neutral-300" />
          <div className="h-16 w-24 rounded bg-neutral-300" />
        </div>
        <p
          className="mt-2"
          style={{
            fontFamily: getFontFallback(theme.fontCaptions),
            fontSize: "11px",
            opacity: 0.7,
          }}
        >
          Caption text — Sunset at Lake Superior
        </p>
        <p
          className="mt-1"
          style={{
            fontFamily: getFontFallback(theme.fontOverlay),
            fontSize: "11px",
            opacity: 0.5,
          }}
        >
          Overlay text sample
        </p>
      </div>

      {/* Mini Footer */}
      <div
        className="border-t border-neutral-200 px-4 py-3 text-center"
        style={{
          backgroundColor: theme.colorFooterBg,
          fontFamily: getFontFallback(theme.fontFooter),
          color: theme.colorText,
          fontSize: `${theme.footerFontSize * 0.75}px`,
          opacity: 0.6,
        }}
      >
        <p>&copy; 2026 Michael Schroeder. All rights reserved.</p>
        <p className="mt-0.5">
          <span style={{ color: theme.colorAccent }}>contact@example.com</span>
        </p>
      </div>
    </div>
  );
}
