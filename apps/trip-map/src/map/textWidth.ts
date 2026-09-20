// Native has no synchronous text metrics for SVG text, so label widths are
// estimated from per-glyph advances of the two faces. Good to a few px, which is
// all the frame-edge collision guard needs.

const ADVANCE: Record<'cinzel' | 'garamond', { upper: number; lower: number; space: number }> = {
  cinzel: { upper: 0.74, lower: 0.62, space: 0.28 },
  garamond: { upper: 0.62, lower: 0.42, space: 0.24 },
};

export function textWidth(text: string, family: string, size: number, letterSpacing = 0): number {
  const a = family.startsWith('Cinzel') ? ADVANCE.cinzel : ADVANCE.garamond;
  let w = 0;
  for (const ch of text) {
    if (ch === ' ') w += a.space;
    else if (ch !== ch.toLowerCase()) w += a.upper;
    else w += a.lower;
  }
  return w * size + letterSpacing * text.length;
}
