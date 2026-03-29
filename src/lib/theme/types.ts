export interface ThemeSettings {
  fontHeadings: string;
  fontBody: string;
  fontNavMenu: string;
  fontFooter: string;
  fontCaptions: string;
  fontOverlay: string;
  logoPosition: "left" | "center" | "right";
  logoSize: number;
  menuFontSize: number;
  menuJustify: "left" | "center" | "right";
  footerFontSize: number;
  colorSiteBg: string;
  colorHeaderBg: string;
  colorFooterBg: string;
  colorAccent: string;
  colorText: string;
}

export const THEME_DEFAULTS: ThemeSettings = {
  fontHeadings: "EB Garamond",
  fontBody: "EB Garamond",
  fontNavMenu: "EB Garamond",
  fontFooter: "EB Garamond",
  fontCaptions: "EB Garamond",
  fontOverlay: "EB Garamond",
  logoPosition: "left",
  logoSize: 40,
  menuFontSize: 14,
  menuJustify: "right",
  footerFontSize: 14,
  colorSiteBg: "#ffffff",
  colorHeaderBg: "#ffffff",
  colorFooterBg: "#ffffff",
  colorAccent: "#525252",
  colorText: "#171717",
};

export function resolveTheme(
  stored?: Partial<ThemeSettings> | null
): ThemeSettings {
  if (!stored) return { ...THEME_DEFAULTS };
  return { ...THEME_DEFAULTS, ...stored };
}
