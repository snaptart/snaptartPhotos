import type { CSSProperties } from "react";
import type { FontRoleKey } from "./types";

const SLUGS: Record<FontRoleKey, string> = {
  headings: "headings",
  body: "body",
  navMenu: "nav-menu",
  footer: "footer",
  captions: "captions",
  overlay: "overlay",
  labels: "labels",
};

/**
 * Returns an inline style object that pulls font-family + weight + style +
 * text-transform from the active theme's per-role CSS vars. Consumers can
 * spread this into a style prop and still override individual properties
 * (fontStyle, fontSize, etc.) locally — their override wins because it's
 * set after the spread.
 */
export function fontRole(role: FontRoleKey): CSSProperties {
  const slug = SLUGS[role];
  return {
    fontFamily: `var(--theme-font-${slug}-family)`,
    fontWeight: `var(--theme-font-${slug}-weight)` as CSSProperties["fontWeight"],
    fontStyle: `var(--theme-font-${slug}-style)`,
    textTransform: `var(--theme-font-${slug}-transform)` as CSSProperties["textTransform"],
  };
}
