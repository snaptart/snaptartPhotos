let ctx: CanvasRenderingContext2D | null = null;

/** Exact advance width via canvas metrics (fonts are loaded before the map renders). */
export function textWidth(text: string, family: string, size: number, letterSpacing = 0): number {
  ctx ??= document.createElement('canvas').getContext('2d');
  if (!ctx) return text.length * size * 0.6;
  ctx.font = `${size}px "${family}"`;
  return ctx.measureText(text).width + letterSpacing * text.length;
}
