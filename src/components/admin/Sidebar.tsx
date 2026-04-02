"use client";

import Link from "next/link";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";

const navItems = [
  { label: "Dashboard", href: "/admin" },
  { label: "Galleries", href: "/admin/galleries" },
  { label: "Photos", href: "/admin/photos" },
  { label: "Pages", href: "/admin/pages" },
  { label: "Stories", href: "/admin/stories" },
  { label: "Submissions", href: "/admin/submissions" },
  { label: "Menus", href: "/admin/menus" },
  { label: "Themes", href: "/admin/themes" },
  { label: "Settings", href: "/admin/settings" },
];

function HamburgerIcon() {
  return (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

export function AdminSidebar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(true);

  return (
    <>
      {/* Collapsed toggle button */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed left-0 top-0 z-30 flex h-14 w-12 items-center justify-center border-r border-b border-neutral-200 bg-white text-neutral-600 hover:text-neutral-900"
          aria-label="Open sidebar"
        >
          <HamburgerIcon />
        </button>
      )}

      <aside
        className={`flex flex-col border-r border-neutral-200 bg-white transition-all duration-200 ${
          open ? "w-56" : "w-0 overflow-hidden border-r-0"
        }`}
      >
        <div className="border-b border-neutral-200 px-5 py-4">
          <Link href="/admin" className="font-serif text-lg tracking-wide">
            SnaptArt
          </Link>
          <p className="text-xs text-neutral-400">Admin</p>
        </div>

        <nav className="flex-1 px-3 py-4">
          {navItems.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/admin" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`mb-1 block rounded px-3 py-2 text-sm transition-colors ${
                  isActive
                    ? "bg-neutral-100 text-neutral-900 font-medium"
                    : "text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-neutral-200 px-3 py-4">
          <Link
            href="/"
            target="_blank"
            className="mb-1 block rounded px-3 py-2 text-sm text-neutral-600 hover:bg-neutral-50"
          >
            View Site &rarr;
          </Link>
          <button
            onClick={() => signOut({ callbackUrl: "/admin/login" })}
            className="w-full rounded px-3 py-2 text-left text-sm text-neutral-600 hover:bg-neutral-50"
          >
            Sign Out
          </button>
          <button
            onClick={() => setOpen(false)}
            className="mt-1 w-full rounded px-3 py-2 text-left text-sm text-neutral-400 hover:bg-neutral-50 hover:text-neutral-600"
            aria-label="Close sidebar"
          >
            ← Hide sidebar
          </button>
        </div>
      </aside>
    </>
  );
}
