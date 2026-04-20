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
}

export type FontStylesMap = Partial<Record<FontRoleKey, FontRoleStyle>>;

export interface ThemeSettings {
  fontHeadings: string;
  fontBody: string;
  fontNavMenu: string;
  fontFooter: string;
  fontCaptions: string;
  fontOverlay: string;
  fontLabels: string;
  fontStyles?: FontStylesMap;
  bodyFontSize: number;
  logoPosition: "left" | "center" | "right";
  logoSize: number;
  menuFontSize: number;
  menuJustify: "left" | "center" | "right";
  footerFontSize: number;
  colorSiteBg: string;
  colorHeaderBg: string;
  colorFooterBg: string;
  colorFooterText: string;
  colorAccent: string;
  colorText: string;
  colorGalleryCaptions: string;
  colorLightboxText: string;
  colorHeroOverlay: string;
}

export const ROLE_DEFAULTS: Record<FontRoleKey, Required<Omit<FontRoleStyle, "size">> & { size: number | null }> = {
  headings: { weight: 300, italic: true, uppercase: false, size: null },
  body: { weight: 400, italic: false, uppercase: false, size: null },
  navMenu: { weight: 400, italic: false, uppercase: false, size: null },
  footer: { weight: 400, italic: false, uppercase: false, size: null },
  captions: { weight: 400, italic: false, uppercase: false, size: null },
  overlay: { weight: 400, italic: false, uppercase: false, size: null },
  labels: { weight: 400, italic: false, uppercase: true, size: null },
};

export const THEME_DEFAULTS: ThemeSettings = {
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
  bodyFontSize: 16,
  logoPosition: "left",
  logoSize: 40,
  menuFontSize: 14,
  menuJustify: "right",
  footerFontSize: 14,
  colorSiteBg: "#ffffff",
  colorHeaderBg: "#ffffff",
  colorFooterBg: "#ffffff",
  colorFooterText: "#737373",
  colorAccent: "#525252",
  colorText: "#171717",
  colorGalleryCaptions: "#525252",
  colorLightboxText: "#ffffff",
  colorHeroOverlay: "#ffffff",
};

export function resolveTheme(
  stored?: Partial<ThemeSettings> | null
): ThemeSettings {
  if (!stored) return { ...THEME_DEFAULTS, fontStyles: { ...THEME_DEFAULTS.fontStyles } };
  const { fontStyles: storedStyles, ...rest } = stored;
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
  };
}
