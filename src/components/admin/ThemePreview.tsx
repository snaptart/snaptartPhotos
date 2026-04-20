"use client";

import type { FontRoleKey, FontRoleStyle, ThemeSettings } from "@/lib/theme/types";
import { buildGoogleFontsUrl, getFontFallback } from "@/lib/theme/fonts";

interface ThemePreviewProps {
  theme: ThemeSettings;
  siteTitle: string;
  logoUrl: string;
}

function roleStyle(theme: ThemeSettings, key: FontRoleKey): FontRoleStyle {
  return theme.fontStyles?.[key] ?? {};
}

function roleCss(
  theme: ThemeSettings,
  key: FontRoleKey,
  family: string,
  defaultSize: number,
): React.CSSProperties {
  const s = roleStyle(theme, key);
  return {
    fontFamily: getFontFallback(family),
    fontWeight: s.weight ?? 400,
    fontStyle: s.italic ? "italic" : "normal",
    textTransform: s.uppercase ? "uppercase" : "none",
    fontSize: s.size ?? defaultSize,
  };
}

export default function ThemePreview({ theme, siteTitle, logoUrl }: ThemePreviewProps) {
  const fontsUrl = buildGoogleFontsUrl([
    theme.fontHeadings,
    theme.fontBody,
    theme.fontNavMenu,
    theme.fontFooter,
    theme.fontCaptions,
    theme.fontOverlay,
    theme.fontLabels,
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
              ...roleCss(theme, "navMenu", theme.fontNavMenu, theme.menuFontSize * 0.75),
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
        <div
          className="mb-2"
          style={{
            ...roleCss(theme, "labels", theme.fontLabels, 9),
            letterSpacing: "2px",
            opacity: 0.7,
          }}
        >
          Plan View · Sample Label
        </div>
        <h2
          className="mb-2"
          style={roleCss(theme, "headings", theme.fontHeadings, 18)}
        >
          Sample Heading
        </h2>
        <p
          className="mb-3"
          style={{
            ...roleCss(theme, "body", theme.fontBody, 13),
            lineHeight: 1.6,
          }}
        >
          This is sample body text showing how your chosen font and colors look together.
          This is how your chosen font and colors look on longer paragraphs of text.
        </p>
        <div className="flex gap-3">
          <div className="h-16 w-24 rounded bg-neutral-300" />
          <div className="h-16 w-24 rounded bg-neutral-300" />
          <div className="h-16 w-24 rounded bg-neutral-300" />
        </div>
        <p
          className="mt-2"
          style={{
            ...roleCss(theme, "captions", theme.fontCaptions, 11),
            color: theme.colorGalleryCaptions,
          }}
        >
          Caption text — Sample image caption
        </p>
        <div
          className="mt-1 rounded px-2 py-1"
          style={{ backgroundColor: "#1a1a1a", display: "inline-block" }}
        >
          <p
            style={{
              ...roleCss(theme, "overlay", theme.fontOverlay, 11),
              color: theme.colorHeroOverlay,
            }}
          >
            Hero overlay sample
          </p>
        </div>
      </div>

      {/* Mini Footer */}
      <div
        className="border-t border-neutral-200 px-4 py-3 text-center"
        style={{
          backgroundColor: theme.colorFooterBg,
          color: theme.colorFooterText,
          ...roleCss(theme, "footer", theme.fontFooter, theme.footerFontSize * 0.75),
        }}
      >
        <p>&copy; {new Date().getFullYear()} {siteTitle || "Your Site"}. All rights reserved.</p>
        <p className="mt-0.5">
          <span style={{ color: theme.colorAccent }}>contact@example.com</span>
        </p>
      </div>
    </div>
  );
}
