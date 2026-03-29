export const CURATED_FONTS = [
  // Serif
  { name: "EB Garamond", category: "serif" as const },
  { name: "Playfair Display", category: "serif" as const },
  { name: "Lora", category: "serif" as const },
  { name: "Merriweather", category: "serif" as const },
  { name: "Libre Baskerville", category: "serif" as const },
  { name: "Cormorant Garamond", category: "serif" as const },
  // Sans-Serif
  { name: "Inter", category: "sans-serif" as const },
  { name: "Montserrat", category: "sans-serif" as const },
  { name: "Open Sans", category: "sans-serif" as const },
  { name: "Raleway", category: "sans-serif" as const },
  { name: "Poppins", category: "sans-serif" as const },
  { name: "Work Sans", category: "sans-serif" as const },
  { name: "Nunito", category: "sans-serif" as const },
  // Display
  { name: "Oswald", category: "display" as const },
  { name: "Bebas Neue", category: "display" as const },
  { name: "Archivo Black", category: "display" as const },
];

export type FontCategory = (typeof CURATED_FONTS)[number]["category"];

const CATEGORY_FALLBACKS: Record<FontCategory, string> = {
  serif: "Georgia, serif",
  "sans-serif": "system-ui, sans-serif",
  display: "system-ui, sans-serif",
};

export function getFontCategory(fontName: string): FontCategory {
  const font = CURATED_FONTS.find((f) => f.name === fontName);
  return font?.category ?? "serif";
}

export function getFontFallback(fontName: string): string {
  return `"${fontName}", ${CATEGORY_FALLBACKS[getFontCategory(fontName)]}`;
}

export function buildGoogleFontsUrl(fontNames: string[]): string {
  const unique = [...new Set(fontNames.filter(Boolean))];
  if (unique.length === 0) return "";

  const families = unique
    .map((name) => {
      const encoded = name.replace(/ /g, "+");
      return `family=${encoded}:ital,wght@0,300..800;1,300..800`;
    })
    .join("&");

  return `https://fonts.googleapis.com/css2?${families}&display=swap`;
}
