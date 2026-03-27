"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";

const navItems = [
  { label: "Dashboard", href: "/admin" },
  { label: "Galleries", href: "/admin/galleries" },
  { label: "Photos", href: "/admin/photos" },
  { label: "Pages", href: "/admin/pages" },
  { label: "Stories", href: "/admin/stories" },
  { label: "Menus", href: "/admin/menus" },
  { label: "Settings", href: "/admin/settings" },
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex w-56 flex-col border-r border-neutral-200 bg-white">
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
      </div>
    </aside>
  );
}
