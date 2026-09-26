import { opensWithPhoto } from "@/lib/header-over-photo";

/**
 * A page's own layout settings (the editor's Page settings, stored in the
 * content's `root.props`, so they save, undo and restore with the page).
 * Anything left unset follows the site (Look → Pages).
 *
 * Full width is also the page's `isFullBleed` column, which other code reads;
 * the editor keeps the two in step (admin/pages/[id]/edit), and the column wins.
 */
export type PageWidth = "standard" | "reading" | "full";
export type PageMargins = "site" | "narrow" | "none";

export type PageLayout = {
  width?: PageWidth;
  sideMargins?: PageMargins;
  /** px; null = automatic (the site's, or none when the page opens with a full-width photo). */
  spaceTop?: number | null;
  spaceBottom?: number | null;
  /** Phones (under 640px) get their own space above and below. */
  phoneSpace?: boolean;
  spaceTopPhone?: number | null;
  spaceBottomPhone?: number | null;
  /** "" = the site background. */
  background?: string;
};

export const PAGE_LAYOUT_DEFAULTS: Required<PageLayout> = {
  width: "standard",
  sideMargins: "site",
  spaceTop: null,
  spaceBottom: null,
  phoneSpace: false,
  spaceTopPhone: null,
  spaceBottomPhone: null,
  background: "",
};

/**
 * Whether the page's content starts right under the header: it opens with a
 * full-width photo, or (the homepage only) with a Hero Slideshow.
 */
export function opensFlush(
  content: { content?: { type: string; props?: Record<string, unknown> }[] } | null | undefined,
  page: { isFullBleed: boolean; showTitle: boolean },
  isHome: boolean,
): boolean {
  if (opensWithPhoto(content, page)) return true;
  return isHome && content?.content?.[0]?.type === "HeroSlideshow";
}

/** The page's layout from its saved content; pages saved before these settings get the defaults. */
export function pageLayoutOf(content: unknown): PageLayout {
  const root = (content as { root?: { props?: PageLayout } } | null)?.root?.props;
  return root ?? {};
}
