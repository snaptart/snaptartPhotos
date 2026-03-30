import Link from "next/link";
import { db } from "@/lib/db";
import { menuItems, siteSettings, themes } from "@/lib/db/schema";
import { asc, eq } from "drizzle-orm";
import { resolveTheme } from "@/lib/theme/types";
import type { ThemeSettings } from "@/lib/theme/types";
import { MobileMenu } from "./MobileMenu";

export async function Navbar() {
  let items: { id: string; label: string; url: string; targetType: string }[] = [];
  let navSettings: { siteTitle: string; logoUrl: string | null; instagramUrl: string | null; activeThemeId: string | null } | null = null;
  let theme: ThemeSettings = resolveTheme();

  try {
    items = await db.select().from(menuItems).orderBy(asc(menuItems.position));
    const rows = await db.select().from(siteSettings).limit(1);
    navSettings = rows[0] ?? null;
    if (navSettings?.activeThemeId) {
      const themeRows = await db.select().from(themes).where(eq(themes.id, navSettings.activeThemeId)).limit(1);
      if (themeRows[0]) {
        theme = resolveTheme(themeRows[0].themeSettings as Record<string, unknown>);
      }
    }
  } catch {
    // DB not available — use fallback
  }

  const siteTitle = navSettings?.siteTitle ?? "SnaptArt";
  const logoUrl = navSettings?.logoUrl;
  const instagramUrl = navSettings?.instagramUrl;

  const mobileLogoSize = Math.round(theme.logoSize / 3);

  const logoEl = (size: number) => (
    <Link href="/" className="flex items-center gap-3">
      {logoUrl ? (
        <img
          src={logoUrl}
          alt={siteTitle}
          className="w-auto"
          style={{ height: `${size}px` }}
        />
      ) : (
        <span
          className="font-light tracking-widest"
          style={{
            fontFamily: "var(--theme-font-headings)",
            fontSize: `${size * 0.6}px`,
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
      className="hidden md:flex items-center gap-8 tracking-wide"
      style={{ fontSize: `${theme.menuFontSize}px`, fontFamily: "var(--theme-font-nav-menu)" }}
    >
      {items.map((item) => (
        <Link
          key={item.id}
          href={item.url}
          className="transition-colors hover:opacity-70"
          {...(item.targetType === "external" ? { target: "_blank", rel: "noopener noreferrer" } : {})}
        >
          {item.label}
        </Link>
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
  slots[theme.logoPosition].push(<div key="logo">{logoEl(theme.logoSize)}</div>);
  slots[theme.menuJustify].push(<div key="menu">{menuEl}</div>);

  return (
    <header
      className="relative border-b border-neutral-200"
      style={{ backgroundColor: "var(--theme-color-header-bg)" }}
    >
      {/* Desktop nav */}
      <nav className="mx-auto hidden md:grid max-w-7xl grid-cols-[1fr_auto_1fr] items-center px-6 py-4">
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
        <div>{logoEl(mobileLogoSize)}</div>
        <div />
      </nav>
    </header>
  );
}
