export interface ThemeSettings {
  fontHeadings: string;
  fontBody: string;
  fontNavMenu: string;
  fontFooter: string;
  fontCaptions: string;
  fontOverlay: string;
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

export const THEME_DEFAULTS: ThemeSettings = {
  fontHeadings: "EB Garamond",
  fontBody: "EB Garamond",
  fontNavMenu: "EB Garamond",
  fontFooter: "EB Garamond",
  fontCaptions: "EB Garamond",
  fontOverlay: "EB Garamond",
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
  if (!stored) return { ...THEME_DEFAULTS };
  return { ...THEME_DEFAULTS, ...stored };
}
