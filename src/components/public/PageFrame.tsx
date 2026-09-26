import type { CSSProperties, ReactNode } from "react";
import { cssColor } from "@/lib/theme/color";
import { fontRole } from "@/lib/theme/role-style";
import { PAGE_LAYOUT_DEFAULTS, type PageLayout } from "@/lib/page-layout";

/** Side margins as [phones, from 768px]. */
const MARGINS = {
  site: ["var(--theme-page-margin-phone,24px)", "var(--theme-page-margin,96px)"],
  narrow: ["calc(var(--theme-page-margin-phone,24px) / 2)", "calc(var(--theme-page-margin,96px) / 2)"],
  none: ["0px", "0px"],
} as const;

const SPACE =
  "pt-[var(--page-top)] pb-[var(--page-bottom)] max-sm:pt-[var(--page-top-phone)] max-sm:pb-[var(--page-bottom-phone)]";

const px = (v: number | null | undefined, auto: string) => (v == null ? auto : `${v}px`);

/**
 * The column a page's blocks sit in, and the space around them: the site's
 * (Look → Pages) unless the page sets its own (Page settings in the editor).
 * The public pages and the editor's preview both draw pages through this, so
 * the preview matches the site.
 *
 * Automatic space: none above when the page opens with a full-width photo
 * (`flushTop`), and none at all on a full-width page, as before these settings.
 */
export function PageFrame({
  layout,
  isFullBleed,
  flushTop = false,
  title,
  children,
}: {
  layout: PageLayout;
  isFullBleed: boolean;
  flushTop?: boolean;
  /** Shown above the blocks when the page shows its title. */
  title?: string | null;
  children: ReactNode;
}) {
  const l = { ...PAGE_LAYOUT_DEFAULTS, ...layout };
  const autoTop = flushTop || isFullBleed ? "0px" : "var(--theme-page-space-top,64px)";
  const autoBottom = isFullBleed ? "0px" : "var(--theme-page-space-bottom,64px)";
  const top = px(l.spaceTop, autoTop);
  const bottom = px(l.spaceBottom, autoBottom);
  const [marginPhone, margin] = MARGINS[l.sideMargins] ?? MARGINS.site;
  const vars = {
    "--page-top": top,
    "--page-bottom": bottom,
    "--page-top-phone": l.phoneSpace ? px(l.spaceTopPhone, autoTop) : top,
    "--page-bottom-phone": l.phoneSpace ? px(l.spaceBottomPhone, autoBottom) : bottom,
    "--page-margin": margin,
    "--page-margin-phone": marginPhone,
    "--page-max": l.width === "reading" ? "48rem" : "var(--theme-page-max,1440px)",
  } as CSSProperties;
  const background = cssColor(l.background) || undefined;

  if (isFullBleed) {
    return (
      <div className={`fullbleed-puck-host flex flex-1 flex-col ${SPACE}`} style={{ ...vars, backgroundColor: background }}>
        {title && (
          <h1
            className="px-[var(--theme-page-margin-phone,24px)] pt-16 pb-8 text-4xl md:px-[var(--theme-page-margin,96px)] md:text-5xl"
            style={fontRole("headings")}
          >
            {title}
          </h1>
        )}
        {children}
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col" style={{ backgroundColor: background }}>
      <div
        className={`mx-auto w-full max-w-[var(--page-max)] px-[var(--page-margin-phone)] md:px-[var(--page-margin)] ${SPACE}`}
        style={vars}
      >
        {title && (
          <h1 className="mb-10 text-4xl md:text-5xl" style={fontRole("headings")}>
            {title}
          </h1>
        )}
        {children}
      </div>
    </div>
  );
}
