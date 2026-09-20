// Maps the gallery's configured font name → CSS variable set up in app/layout.tsx.
// Falls back to the raw name so custom values still work.

export const HANDWRITING_FONT_OPTIONS = [
  "Homemade Apple",
  "Caveat",
  "Reenie Beanie",
  "Gloria Hallelujah",
] as const;

export const STAMP_FONT_OPTIONS = [
  "JetBrains Mono",
  "IBM Plex Mono",
  "Courier Prime",
] as const;

export const DEFAULT_HANDWRITING_FONT = "Homemade Apple";
export const DEFAULT_STAMP_FONT = "JetBrains Mono";

const HANDWRITING_VAR: Record<string, string> = {
  "Homemade Apple": "var(--font-homemade-apple)",
  Caveat: "var(--font-caveat)",
  "Reenie Beanie": "var(--font-reenie-beanie)",
  "Gloria Hallelujah": "var(--font-gloria-hallelujah)",
};

const STAMP_VAR: Record<string, string> = {
  "JetBrains Mono": "var(--font-mono)",
  "IBM Plex Mono": "var(--font-ibm-plex-mono)",
  "Courier Prime": "var(--font-courier-prime)",
};

export function handwritingFontStack(name?: string | null): string {
  const key = name && name.trim() ? name : DEFAULT_HANDWRITING_FONT;
  const v = HANDWRITING_VAR[key];
  return v ? `${v}, cursive` : `"${key}", cursive`;
}

export function stampFontStack(name?: string | null): string {
  const key = name && name.trim() ? name : DEFAULT_STAMP_FONT;
  const v = STAMP_VAR[key];
  return v ? `${v}, monospace` : `"${key}", monospace`;
}
