/**
 * One page container for the whole public site.
 *
 * Before this existed the navbar was max-w-7xl px-6, the gallery page was
 * max-w-7xl px-4 and the page renderer was max-w-5xl px-4 — three different
 * measures, which is why pages did not line up with each other.
 *
 * 1440 max width with 96px side margins gives a 1248px content column: a
 * 12-column grid at 24px gutters (12 × 78 + 11 × 24 = 1200 + 48). Narrow the
 * gutter here and every page follows.
 */
export const PAGE_CONTAINER = "mx-auto w-full max-w-[1440px] px-6 md:px-24";

/** Reading measure for long-form text (stories, rich-text pages). */
export const PROSE_CONTAINER = "mx-auto w-full max-w-3xl px-6 md:px-24";
