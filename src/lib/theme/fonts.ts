export type FontCategory = "serif" | "sans-serif" | "display" | "mono";

export interface CuratedFont {
  name: string;
  category: FontCategory;
  /**
   * Google Fonts css2 axis spec for this family, e.g. "ital,wght@0,400..800;1,400..800".
   *
   * IMPORTANT: asking for a weight the family does not have makes the css2 endpoint
   * return HTTP 400 for the WHOLE request — every family in that URL fails to load,
   * silently, with no console error beyond the failed stylesheet. Only add an `axes`
   * string you have actually checked against fonts.googleapis.com.
   *
   * Leave `axes` undefined when the range has not been verified: the URL then asks for
   * the bare family, which always succeeds (regular weight only). Degraded, but safe.
   */
  axes?: string;
}

/** ital + a variable weight range, the shape css2 wants. */
const italWght = (lo: number, hi: number) =>
  `ital,wght@0,${lo}..${hi};1,${lo}..${hi}`;

export const CURATED_FONTS: CuratedFont[] = [
  // Serif
  { name: "EB Garamond", category: "serif", axes: italWght(400, 800) },
  { name: "Fraunces", category: "serif", axes: italWght(300, 800) },
  { name: "Playfair Display", category: "serif", axes: italWght(400, 900) },
  { name: "Cormorant Garamond", category: "serif", axes: italWght(300, 700) },
  { name: "Lora", category: "serif" },
  { name: "Merriweather", category: "serif" },
  { name: "Libre Baskerville", category: "serif" },
  // Sans-Serif
  { name: "Instrument Sans", category: "sans-serif", axes: italWght(400, 700) },
  { name: "Inter", category: "sans-serif", axes: italWght(100, 900) },
  { name: "Montserrat", category: "sans-serif" },
  { name: "Open Sans", category: "sans-serif" },
  { name: "Raleway", category: "sans-serif" },
  { name: "Poppins", category: "sans-serif" },
  { name: "Work Sans", category: "sans-serif" },
  { name: "Nunito", category: "sans-serif" },
  // Display
  { name: "Oswald", category: "display" },
  { name: "Bebas Neue", category: "display" },
  { name: "Archivo Black", category: "display" },
  // Monospace
  { name: "JetBrains Mono", category: "mono", axes: italWght(100, 800) },
  { name: "IBM Plex Mono", category: "mono" },
  { name: "Space Mono", category: "mono" },
  { name: "Roboto Mono", category: "mono" },
];

const CATEGORY_FALLBACKS: Record<FontCategory, string> = {
  serif: "Georgia, serif",
  "sans-serif": "system-ui, sans-serif",
  display: "system-ui, sans-serif",
  mono: "ui-monospace, monospace",
};

export function getFontCategory(fontName: string): FontCategory {
  const font = CURATED_FONTS.find((f) => f.name === fontName);
  return font?.category ?? "serif";
}

export function getFontFallback(fontName: string): string {
  return `"${fontName}", ${CATEGORY_FALLBACKS[getFontCategory(fontName)]}`;
}

/**
 * The family name a CSS font-family value leads with: `"Playfair Display", Georgia, serif`
 * → `Playfair Display`. Rich text stores the whole stack, and the browser may strip or
 * keep the quotes when it round-trips through the DOM, so compare on this.
 */
export function leadingFontFamily(value: string): string {
  return value.split(",")[0].trim().replace(/^["']|["']$/g, "");
}

/** Dropdown group order and labels for font pickers. */
export const FONT_GROUPS: { label: string; category: FontCategory }[] = [
  { label: "Serif", category: "serif" },
  { label: "Sans-serif", category: "sans-serif" },
  { label: "Display", category: "display" },
  { label: "Monospace", category: "mono" },
];

/**
 * Curated fonts picked anywhere in a Puck document — inside rich text or in a block's
 * font prop. Walks the whole tree rather than knowing which components have fonts, so
 * blocks nested in DropZones and future components are covered too.
 */
export function collectRichTextFonts(data: unknown): string[] {
  const found = new Set<string>();
  const walk = (node: unknown) => {
    if (Array.isArray(node)) {
      node.forEach(walk);
    } else if (node && typeof node === "object") {
      for (const [key, value] of Object.entries(node)) {
        // Tiptap marks store `fontFamily`; block props follow `<thing>FontFamily`.
        if ((key === "fontFamily" || key.endsWith("FontFamily")) && typeof value === "string") {
          found.add(leadingFontFamily(value));
        } else {
          walk(value);
        }
      }
    }
  };
  walk(data);
  // Only curated names: a family Google does not serve (Georgia, Arial) would 400 the URL.
  return CURATED_FONTS.filter((f) => found.has(f.name)).map((f) => f.name);
}

export function buildGoogleFontsUrl(fontNames: string[]): string {
  const unique = [...new Set(fontNames.filter(Boolean))];
  if (unique.length === 0) return "";

  const families = unique
    .map((name) => {
      const encoded = name.replace(/ /g, "+");
      const axes = CURATED_FONTS.find((f) => f.name === name)?.axes;
      return axes ? `family=${encoded}:${axes}` : `family=${encoded}`;
    })
    .join("&");

  return `https://fonts.googleapis.com/css2?${families}&display=swap`;
}
