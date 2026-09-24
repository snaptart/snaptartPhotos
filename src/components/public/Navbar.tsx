import Link from "next/link";
import { loadSiteChrome } from "@/lib/site-chrome";
import { MobileMenu } from "./MobileMenu";
import { NavLink } from "./NavLink";
import siteConfig from "@/lib/site.config";
import { PAGE_CONTAINER } from "@/lib/theme/layout";
import { fontRole } from "@/lib/theme/role-style";

export async function Navbar() {
  const { items, settings: navSettings, theme } = await loadSiteChrome();

  const siteTitle = navSettings?.siteTitle ?? siteConfig.siteName;
  const logoUrl = navSettings?.logoUrl;
  const instagramUrl = navSettings?.instagramUrl;

  const mobileLogoSize = Math.round(theme.logoSize / 3);
  const wordmarkSize = theme.wordmarkSize ?? Math.round(theme.logoSize * 0.6);

  const logoEl = (mobile: boolean) => (
    <Link href="/" className="flex items-center gap-3">
      {logoUrl ? (
        <img
          src={logoUrl}
          alt={siteTitle}
          className="w-auto"
          style={{ height: `${mobile ? mobileLogoSize : theme.logoSize}px` }}
        />
      ) : (
        <span
          style={{
            fontFamily: "var(--theme-font-headings)",
            // A third of the desktop size (the image logo's ratio) makes a
            // text wordmark unreadably small, so text only steps down a little.
            fontSize: `${mobile ? Math.round(wordmarkSize * 0.8) : wordmarkSize}px`,
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

  // Desktop menu (hidden on mobile)
  const menuEl = (
    <div
      className="hidden md:flex items-center gap-8"
      style={{
        ...fontRole("navMenu", { tracking: "0.025em" }),
        fontSize: `var(--theme-font-nav-menu-size, ${theme.menuFontSize}px)`,
      }}
    >
      {items.map((item) => (
        <NavLink
          key={item.id}
          href={item.url}
          sectionPaths={item.sectionPaths}
          external={item.targetType === "external"}
          // The current page or section is underlined, as on the design's boards.
          className="border-b border-transparent py-1.5 transition-colors hover:opacity-70 aria-[current]:border-current"
        >
          {item.label}
        </NavLink>
      ))}
      {instagramUrl && (
        <a
          href={instagramUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="transition-colors hover:opacity-70"
          aria-label="Instagram"
        >
          <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
          </svg>
        </a>
      )}
    </div>
  );

  // Mobile hamburger menu
  const mobileMenuEl = (
    <MobileMenu items={items} instagramUrl={instagramUrl ?? null} menuFontSize={theme.menuFontSize} />
  );

  // Build 3-column layout: [left] [center] [right]
  // Place logo and menu into the correct slots based on theme
  const slots: Record<string, React.ReactNode[]> = { left: [], center: [], right: [] };
  slots[theme.logoPosition].push(<div key="logo">{logoEl(false)}</div>);
  slots[theme.menuJustify].push(<div key="menu">{menuEl}</div>);

  return (
    <header
      className="relative border-b"
      style={{
        backgroundColor: "var(--theme-color-header-bg)",
        borderColor: "var(--theme-color-rule)",
      }}
    >
      {/* Desktop nav */}
      <nav className={`${PAGE_CONTAINER} hidden md:grid grid-cols-[1fr_auto_1fr] items-center py-5`}>
        <div className="flex items-center gap-4 justify-self-start">
          {slots.left}
        </div>
        <div className="flex items-center gap-4 justify-self-center">
          {slots.center}
        </div>
        <div className="flex items-center gap-4 justify-self-end">
          {slots.right}
        </div>
      </nav>

      {/* Mobile nav: hamburger left, logo centered */}
      <nav className="md:hidden grid grid-cols-[1fr_auto_1fr] items-center px-4 py-3">
        <div className="justify-self-start">
          {mobileMenuEl}
        </div>
        <div>{logoEl(true)}</div>
        <div />
      </nav>
    </header>
  );
}
