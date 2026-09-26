export type FontRoleKey =
  | "headings"
  | "body"
  | "navMenu"
  | "footer"
  | "captions"
  | "overlay"
  | "labels";

export interface FontRoleStyle {
  weight?: number;
  italic?: boolean;
  uppercase?: boolean;
  size?: number | null;
  /** Letter-spacing in em, e.g. 0.18. null = the font's natural spacing. */
  tracking?: number | null;
}

export type FontStylesMap = Partial<Record<FontRoleKey, FontRoleStyle>>;

/**
 * The named text styles from the design's Style board. A font role says which
 * typeface; a text style says how a particular kind of text is set in it —
 * size, leading, weight, spacing, case and colour. Blocks pick a text style
 * rather than setting those one by one.
 *
 * The set is fixed. Presets change the values, not the list.
 */
export type TextStyleKey =
  | "display"
  | "collectionTitle"
  | "photoTitle"
  | "lead"
  | "body"
  | "label"
  | "meta";

/** Theme colours a text style or block can point at instead of a hex value. */
export type ColorTokenKey =
  | "text"
  | "textSoft"
  | "muted"
  | "accent"
  | "rule"
  | "surface"
  | "background";

export interface TextStyle {
  role: FontRoleKey;
  /** px above the mobile breakpoint. */
  size: number;
  /** px below 768px. */
  mobileSize: number;
  /** Unitless line-height. */
  lineHeight: number;
  /** null = the role's weight. */
  weight: number | null;
  /** null = the role's slant. */
  italic: boolean | null;
  /** null = the role's case. */
  uppercase: boolean | null;
  /** Letter-spacing in em. null = the role's tracking. */
  tracking: number | null;
  color: ColorTokenKey;
}

export type TextStylesMap = Record<TextStyleKey, TextStyle>;

/** How a header or footer link reacts to the pointer. */
export type LinkHover = "fade" | "underline" | "color" | "none";

/**
 * Header and footer layout and styling (Look → Header & footer). Colours left
 * "" follow another theme colour, named on each field.
 */
export interface ChromeSettings {
  /** inline: logo and menu on one row · stacked: logo above the menu · split: menu either side of a centred logo. */
  headerLayout: "inline" | "stacked" | "split";
  /** px above and below the header's contents, on wider screens. */
  headerPadding: number;
  headerWidth: "page" | "full";
  headerRule: boolean;
  /** "" = the hairline colour. */
  colorHeaderRule: string;
  /** Pinned headers only: smaller once the page scrolls. */
  headerShrink: boolean;
  /** On pages that open with a full-width photo, the header sits over it, transparent. */
  headerOverPhoto: boolean;
  /** The header's text over the photo. "" = the hero overlay text colour. */
  colorHeaderOverPhoto: string;
  /** A logo image over the photo: as uploaded, or turned white. */
  headerOverPhotoLogo: "original" | "white";
  /** px the logo is nudged right / down from where the layout puts it, without moving anything else. */
  logoOffsetX: number;
  logoOffsetY: number;
  /** The same on phones, where the logo is smaller. */
  mobileLogoOffsetX: number;
  mobileLogoOffsetY: number;
  /** One-row and split layouts: which edge of the logo the menu lines up with. */
  logoAlign: "top" | "center" | "bottom";
  /** The header keeps its own height and the logo hangs below it, over the page. */
  logoOverhang: boolean;
  /** px between the logo and the menu, stacked or side by side. */
  logoGap: number;
  /** px between menu items. */
  menuGap: number;
  /** "" = the text colour. */
  colorMenuText: string;
  /** Hover and current-page colour. "" = the accent colour. */
  colorMenuHighlight: string;
  menuHover: LinkHover;
  menuCurrent: "underline" | "color" | "bold" | "none";
  /** Logo size on phones, % of the desktop size. null = a third for an image, 80% for a wordmark. */
  mobileLogoScale: number | null;
  mobileMenuSide: "left" | "right";
  /** dropdown: a panel under the header · overlay: the whole screen · drawer: a panel sliding in from the side. */
  mobileMenuStyle: "dropdown" | "overlay" | "drawer";

  /** What sits at the head of the footer. */
  footerBrand: "name" | "logo" | "none";
  /** px, the site name as text. */
  footerNameSize: number;
  /** px, the logo image's height. */
  footerLogoHeight: number;
  footerShowTagline: boolean;
  footerShowMenu: boolean;
  footerShowEmail: boolean;
  footerShowSocial: boolean;
  /** The footer text (the © line). */
  footerShowText: boolean;
  /** px above and below the footer's contents, on wider screens. */
  footerPadding: number;
  footerWidth: "page" | "full";
  footerRule: boolean;
  /** "" = the hairline colour. */
  colorFooterRule: string;
  /** "" = the footer text colour. */
  colorFooterLink: string;
  /** "" = the accent colour. */
  colorFooterHighlight: string;
  footerLinkHover: LinkHover;
}

/** Today's header and footer, so a preset saved before these settings looks the same. */
export const CHROME_DEFAULTS: ChromeSettings = {
  headerLayout: "inline",
  headerPadding: 20,
  headerWidth: "page",
  headerRule: true,
  colorHeaderRule: "",
  headerShrink: false,
  headerOverPhoto: false,
  colorHeaderOverPhoto: "",
  headerOverPhotoLogo: "original",
  logoOffsetX: 0,
  logoOffsetY: 0,
  mobileLogoOffsetX: 0,
  mobileLogoOffsetY: 0,
  logoAlign: "center",
  logoOverhang: false,
  logoGap: 16,
  menuGap: 32,
  colorMenuText: "",
  colorMenuHighlight: "",
  menuHover: "fade",
  menuCurrent: "underline",
  mobileLogoScale: null,
  mobileMenuSide: "left",
  mobileMenuStyle: "dropdown",
  footerBrand: "name",
  footerNameSize: 16,
  footerLogoHeight: 32,
  footerShowTagline: true,
  footerShowMenu: true,
  footerShowEmail: true,
  footerShowSocial: true,
  footerShowText: true,
  footerPadding: 48,
  footerWidth: "page",
  footerRule: true,
  colorFooterRule: "",
  colorFooterLink: "",
  colorFooterHighlight: "",
  footerLinkHover: "fade",
};

export interface ThemeSettings extends ChromeSettings {
  fontHeadings: string;
  fontBody: string;
  fontNavMenu: string;
  fontFooter: string;
  fontCaptions: string;
  fontOverlay: string;
  fontLabels: string;
  fontStyles?: FontStylesMap;
  textStyles?: Partial<Record<TextStyleKey, Partial<TextStyle>>>;
  bodyFontSize: number;
  logoPosition: "left" | "center" | "right";
  logoSize: number;
  /** Site title set as text, used when there is no logo image. null size = 60% of logoSize. */
  wordmarkSize: number | null;
  wordmarkWeight: number;
  wordmarkUppercase: boolean;
  /** em */
  wordmarkTracking: number;
  menuFontSize: number;
  menuJustify: "left" | "center" | "right";
  /** scroll: the header scrolls away with the page · pinned: it stays at the top of the window. */
  headerBehavior: "scroll" | "pinned";
  /**
   * bar: name and tagline, links, and the © line in a row · centered: the same, stacked and centred ·
   * columns: name, links and contact in columns over the © line · minimal: the © line alone ·
   * floating: the "i" button in a corner.
   */
  footerStyle: "bar" | "centered" | "columns" | "minimal" | "floating";
  footerFontSize: number;
  colorSiteBg: string;
  colorHeaderBg: string;
  colorFooterBg: string;
  colorFooterText: string;
  colorAccent: string;
  colorText: string;
  /** Running copy a step quieter than colorText. */
  colorTextSoft: string;
  /** Captions, meta lines, small labels. */
  colorMuted: string;
  colorGalleryCaptions: string;
  /** The lightbox scrim. Its greys (meta, rules, button rings) mix from this and colorLightboxText. */
  colorLightboxBg: string;
  colorLightboxText: string;
  colorHeroOverlay: string;
  /** Hairline rules — captions dividers, header underline, table borders. */
  colorRule: string;
  /** Recessed surfaces — form panels, image mats, placeholder tiles. */
  colorSurface: string;
}

export const ROLE_DEFAULTS: Record<
  FontRoleKey,
  Required<Omit<FontRoleStyle, "size" | "tracking">> & {
    size: number | null;
    tracking: number | null;
  }
> = {
  headings: { weight: 300, italic: true, uppercase: false, size: null, tracking: null },
  body: { weight: 400, italic: false, uppercase: false, size: null, tracking: null },
  navMenu: { weight: 400, italic: false, uppercase: false, size: null, tracking: null },
  footer: { weight: 400, italic: false, uppercase: false, size: null, tracking: null },
  captions: { weight: 400, italic: false, uppercase: false, size: null, tracking: null },
  overlay: { weight: 400, italic: false, uppercase: false, size: null, tracking: null },
  labels: { weight: 400, italic: false, uppercase: true, size: null, tracking: null },
};

/**
 * Sizes and leading follow the Style board. Weight, slant, case and tracking
 * are left to the role (null), so a preset that only sets fonts still looks
 * like itself.
 */
export const TEXT_STYLE_DEFAULTS: TextStylesMap = {
  display: { role: "headings", size: 54, mobileSize: 34, lineHeight: 1.08, weight: null, italic: null, uppercase: null, tracking: null, color: "text" },
  collectionTitle: { role: "headings", size: 30, mobileSize: 22, lineHeight: 1.13, weight: null, italic: null, uppercase: null, tracking: null, color: "text" },
  photoTitle: { role: "captions", size: 19, mobileSize: 17, lineHeight: 1.26, weight: null, italic: null, uppercase: null, tracking: null, color: "text" },
  lead: { role: "body", size: 18, mobileSize: 16, lineHeight: 1.7, weight: null, italic: null, uppercase: null, tracking: null, color: "text" },
  body: { role: "body", size: 16, mobileSize: 15, lineHeight: 1.75, weight: null, italic: null, uppercase: null, tracking: null, color: "text" },
  label: { role: "labels", size: 12, mobileSize: 11, lineHeight: 1.4, weight: null, italic: null, uppercase: null, tracking: null, color: "muted" },
  meta: { role: "labels", size: 11, mobileSize: 10, lineHeight: 1.5, weight: null, italic: null, uppercase: null, tracking: null, color: "muted" },
};

export const TEXT_STYLE_KEYS = Object.keys(TEXT_STYLE_DEFAULTS) as TextStyleKey[];

export const TEXT_STYLE_LABELS: Record<TextStyleKey, string> = {
  display: "Display",
  collectionTitle: "Collection title",
  photoTitle: "Photo title",
  lead: "Lead",
  body: "Body",
  label: "Label",
  meta: "Meta",
};

export const ROLE_LABELS: Record<FontRoleKey, string> = {
  headings: "Headings",
  body: "Body",
  navMenu: "Nav menu",
  footer: "Footer",
  captions: "Captions",
  overlay: "Overlay text",
  labels: "Labels",
};

/** The ThemeSettings field holding each role's typeface. */
export const ROLE_FAMILY_FIELDS: Record<FontRoleKey, keyof ThemeSettings> = {
  headings: "fontHeadings",
  body: "fontBody",
  navMenu: "fontNavMenu",
  footer: "fontFooter",
  captions: "fontCaptions",
  overlay: "fontOverlay",
  labels: "fontLabels",
};

export const COLOR_TOKENS: {
  key: ColorTokenKey;
  label: string;
  field: keyof ThemeSettings;
  cssVar: string;
}[] = [
  { key: "text", label: "Text", field: "colorText", cssVar: "--theme-color-text" },
  { key: "textSoft", label: "Secondary text", field: "colorTextSoft", cssVar: "--theme-color-text-soft" },
  { key: "muted", label: "Muted", field: "colorMuted", cssVar: "--theme-color-muted" },
  { key: "accent", label: "Accent", field: "colorAccent", cssVar: "--theme-color-accent" },
  { key: "rule", label: "Rule", field: "colorRule", cssVar: "--theme-color-rule" },
  { key: "surface", label: "Surface", field: "colorSurface", cssVar: "--theme-color-surface" },
  { key: "background", label: "Background", field: "colorSiteBg", cssVar: "--theme-color-site-bg" },
];

export function colorTokenVar(key: ColorTokenKey): string {
  const token = COLOR_TOKENS.find((t) => t.key === key) ?? COLOR_TOKENS[0];
  return `var(${token.cssVar})`;
}

export const THEME_DEFAULTS: ThemeSettings = {
  ...CHROME_DEFAULTS,
  fontHeadings: "EB Garamond",
  fontBody: "EB Garamond",
  fontNavMenu: "EB Garamond",
  fontFooter: "EB Garamond",
  fontCaptions: "EB Garamond",
  fontOverlay: "EB Garamond",
  fontLabels: "JetBrains Mono",
  fontStyles: {
    headings: { ...ROLE_DEFAULTS.headings },
    body: { ...ROLE_DEFAULTS.body },
    navMenu: { ...ROLE_DEFAULTS.navMenu },
    footer: { ...ROLE_DEFAULTS.footer },
    captions: { ...ROLE_DEFAULTS.captions },
    overlay: { ...ROLE_DEFAULTS.overlay },
    labels: { ...ROLE_DEFAULTS.labels },
  },
  textStyles: TEXT_STYLE_DEFAULTS,
  bodyFontSize: 16,
  logoPosition: "left",
  logoSize: 40,
  // Matches the navbar's old hard-coded `font-light tracking-widest`.
  wordmarkSize: null,
  wordmarkWeight: 300,
  wordmarkUppercase: false,
  wordmarkTracking: 0.1,
  menuFontSize: 14,
  menuJustify: "right",
  headerBehavior: "scroll",
  footerStyle: "bar",
  footerFontSize: 14,
  colorSiteBg: "#ffffff",
  colorHeaderBg: "#ffffff",
  colorFooterBg: "#ffffff",
  colorFooterText: "#737373",
  colorAccent: "#525252",
  colorText: "#171717",
  colorTextSoft: "#404040",
  colorMuted: "#737373",
  colorGalleryCaptions: "#525252",
  colorLightboxBg: "#14130F",
  colorLightboxText: "#ffffff",
  colorHeroOverlay: "#ffffff",
  colorRule: "#e5e5e5",
  colorSurface: "#fafafa",
};

export function resolveTheme(
  stored?: Partial<ThemeSettings> | null
): ThemeSettings {
  const { fontStyles: storedStyles, textStyles: storedText, ...rest } = stored ?? {};
  const mergedStyles: FontStylesMap = {};
  for (const key of Object.keys(ROLE_DEFAULTS) as FontRoleKey[]) {
    mergedStyles[key] = {
      ...ROLE_DEFAULTS[key],
      ...(storedStyles?.[key] ?? {}),
    };
  }
  return {
    ...THEME_DEFAULTS,
    ...rest,
    fontStyles: mergedStyles,
    textStyles: resolveTextStyles(storedText),
  };
}

/** Fills every text style in, so presets saved before text styles existed still work. */
export function resolveTextStyles(
  stored?: Partial<Record<TextStyleKey, Partial<TextStyle>>> | null
): TextStylesMap {
  const out = {} as TextStylesMap;
  for (const key of TEXT_STYLE_KEYS) {
    out[key] = { ...TEXT_STYLE_DEFAULTS[key], ...(stored?.[key] ?? {}) };
  }
  return out;
}
