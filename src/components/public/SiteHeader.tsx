import Link from "next/link";
import { Fragment, type CSSProperties, type ReactNode } from "react";
import type { ThemeSettings } from "@/lib/theme/types";
import { PAGE_CONTAINER } from "@/lib/theme/layout";
import { fontRole } from "@/lib/theme/role-style";
import { MobileMenu } from "./MobileMenu";
import { NavLink } from "./NavLink";
import { HeaderScroll } from "./HeaderScroll";
import { InstagramIcon } from "./InstagramIcon";

export type HeaderMenuItem = { id: string; label: string; url: string; targetType: string; sectionPaths?: string[] };

export interface SiteHeaderProps {
  theme: ThemeSettings;
  siteTitle: string;
  logoUrl: string | null;
  items: HeaderMenuItem[];
  instagramUrl: string | null;
  /**
   * Drawn in the admin's preview: never pinned to the window, and the first
   * menu item stands in for the current page.
   */
  preview?: boolean;
}

/** The container a header or footer sits in: the page's column, or the whole window. */
export function chromeContainer(width: "page" | "full") {
  return width === "full" ? "w-full px-6 md:px-10" : PAGE_CONTAINER;
}

/**
 * The site header, as Look → Header & footer sets it. The public Navbar and the
 * admin's theme preview both draw it, so the preview is the real thing.
 */
export function SiteHeader({ theme, siteTitle, logoUrl, items, instagramUrl, preview = false }: SiteHeaderProps) {
  const pinned = theme.headerBehavior === "pinned";
  const wordmarkSize = theme.wordmarkSize ?? Math.round(theme.logoSize * 0.6);
  const phone = theme.mobileLogoScale;
  const imageHeight = (mobile: boolean) =>
    mobile ? (phone ? Math.round((theme.logoSize * phone) / 100) : Math.round(theme.logoSize / 3)) : theme.logoSize;
  // A third of the desktop size (the image logo's ratio) makes a text wordmark
  // unreadably small, so by default text only steps down a little.
  const textSize = (mobile: boolean) =>
    mobile ? (phone ? Math.round((wordmarkSize * phone) / 100) : Math.round(wordmarkSize * 0.8)) : wordmarkSize;
  const scaled = (px: number) => `calc(${px}px * var(--site-header-scale))`;

  // Hanging: the header's height comes from the menu, and the logo hangs from the top of the row, over the page.
  const overhang = theme.logoOverhang && theme.headerLayout !== "stacked";
  const align = overhang ? "items-stretch" : { top: "items-start", center: "items-center", bottom: "items-end" }[theme.logoAlign];

  const logo = (mobile: boolean) => {
    const x = mobile ? theme.mobileLogoOffsetX : theme.logoOffsetX;
    const y = mobile ? theme.mobileLogoOffsetY : theme.logoOffsetY;
    const link = logoLink(mobile, x || y ? { transform: `translate(${x}px, ${y}px)` } : undefined);
    return overhang ? (
      <div className="self-start" style={{ height: 0 }}>
        {link}
      </div>
    ) : (
      link
    );
  };

  const logoLink = (mobile: boolean, style: CSSProperties | undefined) => (
    <Link href="/" className="flex items-center gap-3" style={style}>
      {logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={logoUrl} alt={siteTitle} className="site-logo-img w-auto" style={{ height: scaled(imageHeight(mobile)) }} />
      ) : (
        <span
          className="site-wordmark"
          style={{
            fontFamily: "var(--theme-font-headings)",
            fontSize: scaled(textSize(mobile)),
            fontWeight: theme.wordmarkWeight,
            textTransform: theme.wordmarkUppercase ? "uppercase" : "none",
            letterSpacing: `${theme.wordmarkTracking}em`,
          }}
        >
          {siteTitle}
        </span>
      )}
    </Link>
  );

  const menuType: CSSProperties = {
    ...fontRole("navMenu", { tracking: "0.025em" }),
    fontSize: `var(--theme-font-nav-menu-size, ${theme.menuFontSize}px)`,
    gap: "var(--theme-menu-gap)",
  };
  const menu = (list: HeaderMenuItem[], withInstagram: boolean) => (
    <div className="flex items-center" style={menuType}>
      {list.map((item) => (
        <NavLink
          key={item.id}
          href={item.url}
          sectionPaths={item.sectionPaths}
          external={item.targetType === "external"}
          current={preview && item === items[0]}
          className="site-menu-link py-1.5"
        >
          {item.label}
        </NavLink>
      ))}
      {withInstagram && instagramUrl && (
        <a href={instagramUrl} target="_blank" rel="noopener noreferrer" className="site-menu-link" aria-label="Instagram">
          <InstagramIcon />
        </a>
      )}
    </div>
  );

  let desktop: ReactNode;
  if (theme.headerLayout === "stacked") {
    // Logo above the menu, both aligned to the logo's position.
    const across = { left: "items-start", center: "items-center", right: "items-end" }[theme.logoPosition];
    desktop = (
      <div className={`flex flex-col ${across}`} style={{ gap: theme.logoGap }}>
        {logo(false)}
        {menu(items, true)}
      </div>
    );
  } else if (theme.headerLayout === "split") {
    // The menu's first half left of a centred logo, the rest to its right.
    const half = Math.ceil(items.length / 2);
    desktop = (
      <div className={`grid grid-cols-[1fr_auto_1fr] ${align}`} style={{ columnGap: "calc(var(--theme-menu-gap) * 1.5)" }}>
        <div className="flex items-center justify-self-end">{menu(items.slice(0, half), false)}</div>
        {logo(false)}
        <div className="flex items-center justify-self-start">{menu(items.slice(half), true)}</div>
      </div>
    );
  } else {
    // Three slots; the logo and the menu each take one (or share it).
    const slots: Record<"left" | "center" | "right", ReactNode[]> = { left: [], center: [], right: [] };
    slots[theme.logoPosition].push(<Fragment key="logo">{logo(false)}</Fragment>);
    slots[theme.menuJustify].push(<div key="menu">{menu(items, true)}</div>);
    const slot = `flex ${overhang ? "items-center" : align}`;
    desktop = (
      <div className={`grid grid-cols-[1fr_auto_1fr] ${align}`}>
        <div className={`${slot} justify-self-start`} style={{ gap: theme.logoGap }}>{slots.left}</div>
        <div className={`${slot} justify-self-center`} style={{ gap: theme.logoGap }}>{slots.center}</div>
        <div className={`${slot} justify-self-end`} style={{ gap: theme.logoGap }}>{slots.right}</div>
      </div>
    );
  }

  const menuButton = (
    <MobileMenu
      items={items}
      instagramUrl={instagramUrl}
      menuFontSize={theme.menuFontSize}
      side={theme.mobileMenuSide}
      menuStyle={theme.mobileMenuStyle}
    />
  );
  const right = theme.mobileMenuSide === "right";

  return (
    <header
      className="site-header"
      data-pinned={pinned && !preview ? "" : undefined}
      data-shrink={pinned && theme.headerShrink ? "" : undefined}
      data-over-photo={theme.headerOverPhoto ? "" : undefined}
      data-photo-logo={theme.headerOverPhotoLogo}
      data-menu-hover={theme.menuHover}
      data-menu-current={theme.menuCurrent}
      data-logo-overhang={overhang ? "" : undefined}
    >
      <nav className={`site-header-bar hidden md:block ${chromeContainer(theme.headerWidth)}`}>{desktop}</nav>

      {/* Phones: the menu button on its side, the logo centred */}
      <nav
        className={`grid grid-cols-[1fr_auto_1fr] ${overhang ? "items-stretch" : "items-center"} px-4 md:hidden`}
        style={{ paddingBlock: "calc(12px * var(--site-header-scale))" }}
      >
        <div className="flex items-center justify-self-start">{!right && menuButton}</div>
        <div className="flex justify-center">{logo(true)}</div>
        <div className="flex items-center justify-self-end">{right && menuButton}</div>
      </nav>

      {pinned && !preview && (theme.headerShrink || theme.headerOverPhoto) && <HeaderScroll />}
    </header>
  );
}
