import type { FontRoleKey, FontRoleStyle, ThemeSettings } from "./types";
import { getFontFallback } from "./fonts";

const JUSTIFY_MAP: Record<string, string> = {
  left: "flex-start",
  center: "center",
  right: "flex-end",
};

// Maps our camelCase role key → kebab-case slug used in CSS classes + vars.
const ROLE_SLUGS: Record<FontRoleKey, string> = {
  headings: "headings",
  body: "body",
  navMenu: "nav-menu",
  footer: "footer",
  captions: "captions",
  overlay: "overlay",
  labels: "labels",
};

const ROLE_FAMILIES: Record<FontRoleKey, keyof ThemeSettings> = {
  headings: "fontHeadings",
  body: "fontBody",
  navMenu: "fontNavMenu",
  footer: "fontFooter",
  captions: "fontCaptions",
  overlay: "fontOverlay",
  labels: "fontLabels",
};

const ROLE_KEYS: FontRoleKey[] = [
  "headings",
  "body",
  "navMenu",
  "footer",
  "captions",
  "overlay",
  "labels",
];

function roleStyle(theme: ThemeSettings, key: FontRoleKey): FontRoleStyle {
  return theme.fontStyles?.[key] ?? {};
}

function roleVars(theme: ThemeSettings, key: FontRoleKey): string {
  const slug = ROLE_SLUGS[key];
  const familyField = ROLE_FAMILIES[key];
  const family = getFontFallback(theme[familyField] as string);
  const style = roleStyle(theme, key);
  const weight = style.weight ?? 400;
  const italic = style.italic ? "italic" : "normal";
  const transform = style.uppercase ? "uppercase" : "none";
  // Size is intentionally optional. When undefined we omit the var so inline
  // fontSize / inherited sizes keep working.
  const sizeLine =
    style.size != null
      ? `  --theme-font-${slug}-size: ${style.size}px;\n`
      : "";
  return (
    `  --theme-font-${slug}-family: ${family};\n` +
    `  --theme-font-${slug}-weight: ${weight};\n` +
    `  --theme-font-${slug}-style: ${italic};\n` +
    `  --theme-font-${slug}-transform: ${transform};\n` +
    sizeLine
  );
}

function roleClass(key: FontRoleKey): string {
  const slug = ROLE_SLUGS[key];
  return `.theme-font-${slug} {
  font-family: var(--theme-font-${slug}-family);
  font-weight: var(--theme-font-${slug}-weight);
  font-style: var(--theme-font-${slug}-style);
  text-transform: var(--theme-font-${slug}-transform);
  font-size: var(--theme-font-${slug}-size, inherit);
}`;
}

export function buildThemeCssVars(theme: ThemeSettings): string {
  const perRoleVars = ROLE_KEYS.map((k) => roleVars(theme, k)).join("");
  const perRoleClasses = ROLE_KEYS.map(roleClass).join("\n");

  return `:root {
  /* Family aliases — kept for consumers that only need fontFamily */
  --theme-font-headings: ${getFontFallback(theme.fontHeadings)};
  --theme-font-body: ${getFontFallback(theme.fontBody)};
  --theme-font-nav-menu: ${getFontFallback(theme.fontNavMenu)};
  --theme-font-footer: ${getFontFallback(theme.fontFooter)};
  --theme-font-captions: ${getFontFallback(theme.fontCaptions)};
  --theme-font-overlay: ${getFontFallback(theme.fontOverlay)};
  --theme-font-labels: ${getFontFallback(theme.fontLabels)};
  /* Per-role full styles */
${perRoleVars}  --theme-body-font-size: ${theme.bodyFontSize}px;
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
  --theme-color-gallery-captions: ${theme.colorGalleryCaptions};
  --theme-color-lightbox-text: ${theme.colorLightboxText};
  --theme-color-hero-overlay: ${theme.colorHeroOverlay};
}
${perRoleClasses}`;
}
