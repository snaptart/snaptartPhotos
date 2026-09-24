import type { CSSProperties } from "react";
import type { FontRoleKey, TextStyleKey } from "./types";

// camelCase key → kebab-case slug used in CSS classes + vars.
export const ROLE_SLUGS: Record<FontRoleKey, string> = {
  headings: "headings",
  body: "body",
  navMenu: "nav-menu",
  footer: "footer",
  captions: "captions",
  overlay: "overlay",
  labels: "labels",
};

export const TEXT_STYLE_SLUGS: Record<TextStyleKey, string> = {
  display: "display",
  collectionTitle: "collection-title",
  photoTitle: "photo-title",
  lead: "lead",
  body: "body",
  label: "label",
  meta: "meta",
};

/**
 * Returns an inline style object that pulls font-family + weight + style +
 * text-transform + letter-spacing from the active theme's per-role CSS vars.
 * Consumers can spread this into a style prop and still override individual
 * properties (fontStyle, fontSize, etc.) locally — their override wins because
 * it's set after the spread.
 *
 * `tracking` is what to use when the role has no tracking of its own. Being an
 * inline style, the role's spacing beats any Tailwind `tracking-*` class on the
 * same element, so a caller that used one passes its value here instead.
 */
export function fontRole(role: FontRoleKey, opts?: { tracking?: string }): CSSProperties {
  const slug = ROLE_SLUGS[role];
  return {
    fontFamily: `var(--theme-font-${slug}-family)`,
    fontWeight: `var(--theme-font-${slug}-weight)` as CSSProperties["fontWeight"],
    fontStyle: `var(--theme-font-${slug}-style)`,
    textTransform: `var(--theme-font-${slug}-transform)` as CSSProperties["textTransform"],
    letterSpacing: `var(--theme-font-${slug}-tracking, ${opts?.tracking ?? "normal"})`,
  };
}

/**
 * Everything a text style sets — typeface, size (smaller on phones), leading,
 * weight, slant, case, spacing and colour — as an inline style object.
 */
export function textStyle(key: TextStyleKey): CSSProperties {
  const s = TEXT_STYLE_SLUGS[key];
  return {
    fontFamily: `var(--theme-text-${s}-family)`,
    fontSize: `var(--theme-text-${s}-size)`,
    lineHeight: `var(--theme-text-${s}-line-height)`,
    fontWeight: `var(--theme-text-${s}-weight)` as CSSProperties["fontWeight"],
    fontStyle: `var(--theme-text-${s}-style)`,
    textTransform: `var(--theme-text-${s}-transform)` as CSSProperties["textTransform"],
    letterSpacing: `var(--theme-text-${s}-tracking)`,
    color: `var(--theme-text-${s}-color)`,
  };
}
