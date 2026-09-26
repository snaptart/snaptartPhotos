/**
 * One page container for the whole public site.
 *
 * Before this existed the navbar was max-w-7xl px-6, the gallery page was
 * max-w-7xl px-4 and the page renderer was max-w-5xl px-4 — three different
 * measures, which is why pages did not line up with each other.
 *
 * The width and side margins come from the theme (Look → Pages); the fallbacks
 * are the defaults: 1440 max width with 96px side margins gives a 1248px
 * content column, a 12-column grid at 24px gutters (12 × 78 + 11 × 24 = 1200 + 48).
 */
export const PAGE_CONTAINER =
  "mx-auto w-full max-w-[var(--theme-page-max,1440px)] px-[var(--theme-page-margin-phone,24px)] md:px-[var(--theme-page-margin,96px)]";

/** The theme's space between the header and a page's content, and between it and the footer. */
export const PAGE_SPACE = "pt-[var(--theme-page-space-top,64px)] pb-[var(--theme-page-space-bottom,64px)]";

/**
 * Vertical rhythm, in px. The design spaces sections by these steps (24 between
 * a heading and its content, 48–96 between sections), so spacing controls offer
 * them as named stops before a free value.
 */
export const SPACE_SCALE: { label: string; value: number }[] = [
  { label: "0", value: 0 },
  { label: "XS", value: 12 },
  { label: "S", value: 24 },
  { label: "M", value: 48 },
  { label: "L", value: 72 },
  { label: "XL", value: 96 },
];

/** Reading measure for long-form text (stories, rich-text pages). */
export const PROSE_CONTAINER =
  "mx-auto w-full max-w-3xl px-[var(--theme-page-margin-phone,24px)] md:px-[var(--theme-page-margin,96px)]";
