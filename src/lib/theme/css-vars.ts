import type { FontRoleKey, FontRoleStyle, TextStyle, TextStyleKey, ThemeSettings } from "./types";
import { TEXT_STYLE_KEYS, colorTokenVar, resolveTextStyles } from "./types";
import { getFontFallback } from "./fonts";
import { ROLE_SLUGS, TEXT_STYLE_SLUGS } from "./role-style";

const JUSTIFY_MAP: Record<string, string> = {
  left: "flex-start",
  center: "center",
  right: "flex-end",
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
  // Same deal as size: omit when unset so the font's natural spacing wins.
  const trackingLine =
    style.tracking != null
      ? `  --theme-font-${slug}-tracking: ${style.tracking}em;\n`
      : "";
  return (
    `  --theme-font-${slug}-family: ${family};\n` +
    `  --theme-font-${slug}-weight: ${weight};\n` +
    `  --theme-font-${slug}-style: ${italic};\n` +
    `  --theme-font-${slug}-transform: ${transform};\n` +
    sizeLine +
    trackingLine
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
  letter-spacing: var(--theme-font-${slug}-tracking, normal);
}`;
}

/**
 * Each text style resolves to concrete vars. The ones left null point at the
 * role's var, so changing a role's weight in Typography still flows through to
 * every text style that doesn't set its own.
 */
function textStyleVars(key: TextStyleKey, style: TextStyle): string {
  const s = TEXT_STYLE_SLUGS[key];
  const r = ROLE_SLUGS[style.role];
  const weight = style.weight ?? `var(--theme-font-${r}-weight)`;
  const slant =
    style.italic == null ? `var(--theme-font-${r}-style)` : style.italic ? "italic" : "normal";
  const transform =
    style.uppercase == null
      ? `var(--theme-font-${r}-transform)`
      : style.uppercase
        ? "uppercase"
        : "none";
  const tracking =
    style.tracking == null ? `var(--theme-font-${r}-tracking, normal)` : `${style.tracking}em`;
  return (
    `  --theme-text-${s}-family: var(--theme-font-${r}-family);\n` +
    `  --theme-text-${s}-size: ${style.size}px;\n` +
    // Lets a block's own px size shrink on phones in the same proportion.
    `  --theme-text-${s}-scale: 1;\n` +
    `  --theme-text-${s}-line-height: ${style.lineHeight};\n` +
    `  --theme-text-${s}-weight: ${weight};\n` +
    `  --theme-text-${s}-style: ${slant};\n` +
    `  --theme-text-${s}-transform: ${transform};\n` +
    `  --theme-text-${s}-tracking: ${tracking};\n` +
    `  --theme-text-${s}-color: ${colorTokenVar(style.color)};\n`
  );
}

function textStyleClass(key: TextStyleKey): string {
  const s = TEXT_STYLE_SLUGS[key];
  return `.theme-text-${s} {
  font-family: var(--theme-text-${s}-family);
  font-size: var(--theme-text-${s}-size);
  line-height: var(--theme-text-${s}-line-height);
  font-weight: var(--theme-text-${s}-weight);
  font-style: var(--theme-text-${s}-style);
  text-transform: var(--theme-text-${s}-transform);
  letter-spacing: var(--theme-text-${s}-tracking);
  color: var(--theme-text-${s}-color);
}`;
}

/**
 * The theme as CSS: variables plus the role and text-style classes.
 * `scope` puts the variables on a selector instead of :root (the admin's
 * previews), and drops the phone sizes, which follow the screen, not the preview.
 */
export function buildThemeCssVars(theme: ThemeSettings, options: { scope?: string } = {}): string {
  const scope = options.scope ?? ":root";
  const perRoleVars = ROLE_KEYS.map((k) => roleVars(theme, k)).join("");
  const perRoleClasses = ROLE_KEYS.map(roleClass).join("\n");
  const textStyles = resolveTextStyles(theme.textStyles);
  const perTextVars = TEXT_STYLE_KEYS.map((k) => textStyleVars(k, textStyles[k])).join("");
  const perTextMobile = TEXT_STYLE_KEYS.map((k) => {
    const { size, mobileSize } = textStyles[k];
    const scale = size > 0 ? Math.round((mobileSize / size) * 1000) / 1000 : 1;
    const s = TEXT_STYLE_SLUGS[k];
    return `    --theme-text-${s}-size: ${mobileSize}px;\n    --theme-text-${s}-scale: ${scale};\n`;
  }).join("");
  const perTextClasses = TEXT_STYLE_KEYS.map(textStyleClass).join("\n");

  return `${scope} {
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
  --theme-color-text-soft: ${theme.colorTextSoft};
  --theme-color-muted: ${theme.colorMuted};
  --theme-color-gallery-captions: ${theme.colorGalleryCaptions};
  --theme-color-lightbox-bg: ${theme.colorLightboxBg};
  --theme-color-lightbox-text: ${theme.colorLightboxText};
  --theme-color-hero-overlay: ${theme.colorHeroOverlay};
  --theme-color-rule: ${theme.colorRule};
  --theme-color-surface: ${theme.colorSurface};
  /* Text styles */
${perTextVars}}
${options.scope ? "" : `@media (max-width: 767px) {
  :root {
${perTextMobile}  }
}
`}${perRoleClasses}
${perTextClasses}`;
}
