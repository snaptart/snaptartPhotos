type Block = { type: string; props?: Record<string, unknown> };

/**
 * Whether a page opens with a photo across the whole window, which the header
 * can lie over (Look → Header → Over a photo). The page then drops its top
 * padding and renders <HeaderOverPhotoMark />; the header follows in CSS.
 *
 * - A Hero Slideshow set to full width, on any page.
 * - A Hero Banner on a full-bleed page (elsewhere it sits inside the page's margins).
 * Not when the page shows its title, which would come first.
 */
export function opensWithPhoto(
  content: { content?: Block[] } | null | undefined,
  page: { isFullBleed: boolean; showTitle: boolean },
): boolean {
  if (page.showTitle) return false;
  const first = content?.content?.[0];
  if (!first) return false;
  if (first.type === "HeroSlideshow") return page.isFullBleed || first.props?.fullBleed !== false;
  if (first.type === "Hero") return page.isFullBleed;
  return false;
}

/** Tells the header (via CSS :has) that this page opens with a photo. */
export function HeaderOverPhotoMark() {
  return <span data-header-over-photo="" hidden />;
}
