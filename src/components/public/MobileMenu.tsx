"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { fontRole } from "@/lib/theme/role-style";
import type { ThemeSettings } from "@/lib/theme/types";
import { NavLink } from "./NavLink";
import { InstagramIcon } from "./InstagramIcon";

interface MobileMenuProps {
  items: { id: string; label: string; url: string; targetType: string; sectionPaths?: string[] }[];
  instagramUrl: string | null;
  menuFontSize: number;
  /** Which side of the header the button is on; a drawer slides in from it. */
  side: ThemeSettings["mobileMenuSide"];
  menuStyle: ThemeSettings["mobileMenuStyle"];
}

function MenuIcon({ open }: { open: boolean }) {
  return (
    <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
      {open ? (
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
      ) : (
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
      )}
    </svg>
  );
}

// The open menu is drawn in the header's own colours, even while the header lies over a photo.
const PANEL_COLORS = {
  backgroundColor: "var(--theme-color-header-bg)",
  color: "var(--theme-color-text)",
  "--site-menu-color": "var(--theme-menu-text)",
} as CSSProperties;

export function MobileMenu({ items, instagramUrl, menuFontSize, side, menuStyle }: MobileMenuProps) {
  const [open, setOpen] = useState(false);
  const coversPage = menuStyle !== "dropdown";

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    // A full-screen menu or drawer holds the page still behind it.
    const root = document.documentElement;
    const overflow = root.style.overflow;
    if (coversPage) root.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      if (coversPage) root.style.overflow = overflow;
    };
  }, [open, coversPage]);

  const size = (scale: number) => `calc(var(--theme-font-nav-menu-size, ${menuFontSize}px) * ${scale})`;
  const type = (scale: number): CSSProperties => ({ ...fontRole("navMenu", { tracking: "0.025em" }), fontSize: size(scale) });

  const links = (
    <>
      {items.map((item) => (
        <NavLink
          key={item.id}
          href={item.url}
          sectionPaths={item.sectionPaths}
          external={item.targetType === "external"}
          className="site-menu-link py-1"
          onClick={() => setOpen(false)}
        >
          {item.label}
        </NavLink>
      ))}
      {instagramUrl && (
        <a
          href={instagramUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="site-menu-link"
          aria-label="Instagram"
        >
          <InstagramIcon className="h-5 w-5" />
        </a>
      )}
    </>
  );

  const button = (
    <button
      type="button"
      onClick={() => setOpen(!open)}
      className="flex h-10 w-10 items-center justify-center"
      aria-label={open ? "Close menu" : "Open menu"}
      aria-expanded={open}
    >
      <MenuIcon open={open} />
    </button>
  );

  // A row matching the header's, so the close button sits where the menu button was.
  const closeRow = (
    <div className={`flex px-4 py-3 ${side === "right" ? "justify-end" : "justify-start"}`}>{button}</div>
  );

  return (
    <div className="md:hidden">
      {button}

      {menuStyle === "dropdown" && open && (
        <div
          className="absolute left-0 right-0 top-full z-50 w-full"
          style={{ ...PANEL_COLORS, borderBottom: "1px solid var(--theme-color-rule)" }}
        >
          <div className="flex flex-col items-center gap-6 px-6 py-6" style={type(1)}>
            {links}
          </div>
        </div>
      )}

      {menuStyle === "overlay" && open && (
        <div className="fixed inset-0 z-50 flex flex-col" style={PANEL_COLORS} role="dialog" aria-modal="true" aria-label="Menu">
          {closeRow}
          <div className="flex flex-1 flex-col items-center justify-center gap-7 overflow-y-auto px-6 pb-16" style={type(1.5)}>
            {links}
          </div>
        </div>
      )}

      {menuStyle === "drawer" && (
        <>
          <div
            className="fixed inset-0 z-50 bg-black/30 transition-opacity duration-300"
            style={{ opacity: open ? 1 : 0, pointerEvents: open ? "auto" : "none" }}
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <div
            className={`fixed bottom-0 top-0 z-50 flex w-[min(80vw,320px)] flex-col shadow-xl transition-[transform,visibility] duration-300 ${side === "right" ? "right-0" : "left-0"}`}
            style={{
              ...PANEL_COLORS,
              transform: open ? "none" : `translateX(${side === "right" ? "100%" : "-100%"})`,
              visibility: open ? "visible" : "hidden",
            }}
            role="dialog"
            aria-modal="true"
            aria-label="Menu"
          >
            {closeRow}
            <div
              className={`flex flex-col gap-5 overflow-y-auto px-6 py-4 ${side === "right" ? "items-end" : "items-start"}`}
              style={type(1.15)}
            >
              {links}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
