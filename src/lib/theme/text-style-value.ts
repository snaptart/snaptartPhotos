import type { CSSProperties } from "react";
import type { FontRoleKey, TextStyleKey } from "./types";
import { ROLE_SLUGS, TEXT_STYLE_SLUGS, textStyle } from "./role-style";
import { cssColor } from "./color";

export type TextCase = "none" | "uppercase" | "lowercase" | "capitalize";

/**
 * How a block stores the look of one piece of its text: a theme text style,
 * plus whatever the editor adjusted on top of it. Anything left out follows the
 * style, so the text moves with the theme until someone deliberately sets it.
 */
export interface TextStyleValue {
  style: TextStyleKey;
  role?: FontRoleKey;
  /** px on desktop; phones scale it by the style's own phone/desktop ratio. */
  size?: number;
  lineHeight?: number;
  weight?: number;
  italic?: boolean;
  transform?: TextCase;
  /** em */
  tracking?: number;
  /** A stored colour — "token:muted" or hex. */
  color?: string;
}

export const TEXT_STYLE_ADJUSTMENTS = [
  "role",
  "size",
  "lineHeight",
  "weight",
  "italic",
  "transform",
  "tracking",
  "color",
] as const satisfies readonly (keyof TextStyleValue)[];

export function hasAdjustments(value: TextStyleValue | undefined): boolean {
  return !!value && TEXT_STYLE_ADJUSTMENTS.some((k) => value[k] !== undefined);
}

/**
 * Inline style for a TextStyleValue. `withColor: false` leaves colour out, for
 * blocks whose text colour lives in their own hover-aware colour fields.
 */
export function textStyleCss(
  value: TextStyleValue | undefined,
  fallback: TextStyleKey,
  opts: { withColor?: boolean } = {}
): CSSProperties {
  const key = value?.style ?? fallback;
  const s = TEXT_STYLE_SLUGS[key];
  const css: CSSProperties = { ...textStyle(key) };

  if (value?.role) css.fontFamily = `var(--theme-font-${ROLE_SLUGS[value.role]}-family)`;
  if (value?.size != null) css.fontSize = `calc(${value.size}px * var(--theme-text-${s}-scale, 1))`;
  if (value?.lineHeight != null) css.lineHeight = value.lineHeight;
  if (value?.weight != null) css.fontWeight = value.weight;
  if (value?.italic != null) css.fontStyle = value.italic ? "italic" : "normal";
  if (value?.transform) css.textTransform = value.transform;
  if (value?.tracking != null) css.letterSpacing = `${value.tracking}em`;
  if (value?.color) css.color = cssColor(value.color);

  if (opts.withColor === false) delete css.color;
  return css;
}

/**
 * Builds a TextStyleValue from a block's pre-text-style settings. A setting
 * still at the block's old default becomes "follow the style"; anything the
 * editor had changed is kept as an adjustment, so their choices survive.
 */
export function fromLegacyTypography(
  style: TextStyleKey,
  legacy: {
    role?: string;
    size?: number;
    weight?: string | number;
    transform?: string;
    /** px, as the old sliders stored it */
    trackingPx?: number;
    italic?: boolean;
    color?: string;
  },
  defaults: {
    role?: string;
    size?: number;
    weight?: string | number;
    transform?: string;
    trackingPx?: number;
    italic?: boolean;
    color?: string;
  }
): TextStyleValue {
  const out: TextStyleValue = { style };
  const changed = <K extends keyof typeof legacy>(k: K) =>
    legacy[k] !== undefined && legacy[k] !== null && String(legacy[k]) !== String(defaults[k]);

  if (changed("role")) out.role = legacy.role as FontRoleKey;
  if (changed("size")) out.size = Number(legacy.size);
  if (changed("weight")) out.weight = Number(legacy.weight);
  if (changed("transform")) out.transform = legacy.transform as TextCase;
  if (changed("italic")) out.italic = !!legacy.italic;
  if (changed("color") && legacy.color) out.color = legacy.color;
  if (changed("trackingPx")) {
    const px = Number(legacy.trackingPx);
    const basis = Number(legacy.size ?? defaults.size) || 16;
    out.tracking = Math.round((px / basis) * 1000) / 1000;
  }
  return out;
}
