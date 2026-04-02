import { ThemeSettings } from "./types";
import { getFontFallback } from "./fonts";

const JUSTIFY_MAP: Record<string, string> = {
  left: "flex-start",
  center: "center",
  right: "flex-end",
};

export function buildThemeCssVars(theme: ThemeSettings): string {
  return `:root {
  --theme-font-headings: ${getFontFallback(theme.fontHeadings)};
  --theme-font-body: ${getFontFallback(theme.fontBody)};
  --theme-font-nav-menu: ${getFontFallback(theme.fontNavMenu)};
  --theme-font-footer: ${getFontFallback(theme.fontFooter)};
  --theme-font-captions: ${getFontFallback(theme.fontCaptions)};
  --theme-font-overlay: ${getFontFallback(theme.fontOverlay)};
  --theme-logo-position: ${theme.logoPosition};
  --theme-logo-size: ${theme.logoSize}px;
  --theme-menu-font-size: ${theme.menuFontSize}px;
  --theme-menu-justify: ${JUSTIFY_MAP[theme.menuJustify] ?? "flex-end"};
  --theme-footer-font-size: ${theme.footerFontSize}px;
  --theme-color-site-bg: ${theme.colorSiteBg};
  --theme-color-header-bg: ${theme.colorHeaderBg};
  --theme-color-footer-bg: ${theme.colorFooterBg};
  --theme-color-footer-text: ${theme.colorFooterText};
  --theme-color-accent: ${theme.colorAccent};
  --theme-color-text: ${theme.colorText};
}`;
}
