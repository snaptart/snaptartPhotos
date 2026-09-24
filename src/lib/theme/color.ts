import { COLOR_TOKENS, colorTokenVar, type ColorTokenKey } from "./types";

/**
 * A colour a block stores can be:
 *   "token:muted"  — a theme colour, so it follows the active preset
 *   "#a4441f"      — a fixed colour
 *   "transparent"
 *   ""             — not set; the block's own fallback applies
 *
 * Saved blocks only ever held hex values before tokens existed, and those
 * pass through unchanged.
 */
const TOKEN_PREFIX = "token:";

export function tokenColor(key: ColorTokenKey): string {
  return `${TOKEN_PREFIX}${key}`;
}

export function colorTokenOf(value: string | null | undefined): ColorTokenKey | null {
  if (!value || !value.startsWith(TOKEN_PREFIX)) return null;
  const key = value.slice(TOKEN_PREFIX.length) as ColorTokenKey;
  return COLOR_TOKENS.some((t) => t.key === key) ? key : null;
}

/** The CSS value for a stored colour; `fallback` when it isn't set. */
export function cssColor(value: string | null | undefined, fallback = ""): string {
  if (!value) return fallback;
  const token = colorTokenOf(value);
  return token ? colorTokenVar(token) : value;
}

/**
 * A stored colour at an opacity (0–1). Hex goes to rgba so existing output is
 * unchanged; a theme colour has no fixed channels to split, so it's mixed
 * with transparent instead.
 */
export function withAlpha(value: string | null | undefined, alpha: number, fallback = "transparent"): string {
  if (!value) return fallback;
  if (value === "transparent" || alpha <= 0) return "transparent";
  if (/^#[0-9a-fA-F]{6}$/.test(value)) {
    const r = parseInt(value.slice(1, 3), 16);
    const g = parseInt(value.slice(3, 5), 16);
    const b = parseInt(value.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
  const css = cssColor(value);
  if (alpha >= 1) return css;
  return `color-mix(in srgb, ${css} ${Math.round(alpha * 100)}%, transparent)`;
}

export function isHexColor(value: string | null | undefined): value is string {
  return !!value && /^#[0-9a-fA-F]{6}$/.test(value);
}
