"use client";

import { useState } from "react";
import Link from "next/link";

interface MobileMenuProps {
  items: { id: string; label: string; url: string; targetType: string }[];
  instagramUrl: string | null;
  menuFontSize: number;
}

export function MobileMenu({ items, instagramUrl, menuFontSize }: MobileMenuProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(!open)}
        className="md:hidden flex items-center justify-center w-10 h-10"
        aria-label={open ? "Close menu" : "Open menu"}
      >
        <svg
          className="h-6 w-6 transition-transform"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          viewBox="0 0 24 24"
        >
          {open ? (
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          ) : (
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          )}
        </svg>
      </button>

      {open && (
        <div
          className="md:hidden absolute left-0 right-0 top-full border-b border-neutral-200 z-50"
          style={{ backgroundColor: "var(--theme-color-header-bg)" }}
        >
          <div
            className="flex flex-col items-center gap-6 px-6 py-6 tracking-wide"
            style={{ fontSize: `${menuFontSize}px`, fontFamily: "var(--theme-font-nav-menu)" }}
          >
            {items.map((item) => (
              <Link
                key={item.id}
                href={item.url}
                className="transition-colors hover:opacity-70"
                onClick={() => setOpen(false)}
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
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
                </svg>
              </a>
            )}
          </div>
        </div>
      )}
    </>
  );
}
