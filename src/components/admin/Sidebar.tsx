"use client";

import Link from "next/link";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  LayoutDashboard,
  Images,
  LayoutGrid,
  FileText,
  BookOpen,
  Inbox,
  Settings as SettingsIcon,
  ExternalLink,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  type LucideIcon,
} from "lucide-react";
import siteConfig from "@/lib/site.config";
import { cn } from "@/lib/utils";

type NavItem = { label: string; href: string; icon: LucideIcon };

const navItems: NavItem[] = [
  { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
  { label: siteConfig.labels.galleries, href: "/admin/galleries", icon: LayoutGrid },
  { label: siteConfig.labels.photos, href: "/admin/photos", icon: Images },
  { label: "Pages", href: "/admin/pages", icon: FileText },
  ...(siteConfig.features.stories
    ? [{ label: "Stories", href: "/admin/stories", icon: BookOpen }]
    : []),
  ...(siteConfig.features.submissions
    ? [{ label: "Submissions", href: "/admin/submissions", icon: Inbox }]
    : []),
  { label: "Settings", href: "/admin/settings", icon: SettingsIcon },
];

export function AdminSidebar({ userEmail = "" }: { userEmail?: string }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(true);
  const avatarLetter = userEmail.charAt(0).toUpperCase() || "S";

  return (
    <>
      {/* Collapsed toggle (shown when sidebar is hidden entirely on small screens) */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed left-0 top-0 z-30 flex h-14 w-12 items-center justify-center border-r border-b border-admin-border bg-admin-surface text-admin-ink-soft hover:text-admin-ink"
          aria-label="Open sidebar"
        >
          <PanelLeftOpen className="h-5 w-5" />
        </button>
      )}

      <aside
        className={cn(
          "flex flex-col bg-admin-surface border-r border-admin-border transition-all duration-200",
          open ? "w-[220px]" : "w-0 overflow-hidden border-r-0",
        )}
      >
        {/* Brand */}
        <div className="border-b border-admin-border px-[18px] py-5 flex items-center gap-2.5">
          <div className="w-8 h-8 flex-shrink-0 bg-admin-ink text-admin-surface rounded-md flex items-center justify-center font-serif italic text-lg">
            {siteConfig.siteName.charAt(0).toLowerCase()}
          </div>
          <div className="min-w-0">
            <Link
              href="/admin"
              className="font-serif italic text-base leading-none text-admin-ink block truncate"
            >
              {siteConfig.siteName}
            </Link>
            <div className="font-mono text-[9px] tracking-[1.5px] text-admin-ink-soft mt-0.5">
              ADMIN
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-2 flex flex-col gap-0.5 overflow-y-auto">
          {navItems.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/admin" && pathname.startsWith(item.href));
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-md text-[13px] transition-colors",
                  isActive
                    ? "bg-admin-accent-soft text-admin-ink font-medium"
                    : "text-admin-ink-soft hover:bg-admin-surface-2 hover:text-admin-ink",
                )}
              >
                <Icon
                  className={cn(
                    "h-4 w-4 shrink-0",
                    isActive ? "text-admin-accent" : "text-admin-ink-faint",
                  )}
                />
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Footer — user + actions */}
        <div className="border-t border-admin-border flex flex-col">
          <div className="px-3.5 py-3 flex items-center gap-2.5 border-b border-admin-border">
            <div className="w-7 h-7 rounded-full bg-[#ddd4c2] text-admin-ink flex items-center justify-center text-[11px] font-semibold flex-shrink-0">
              {avatarLetter}
            </div>
            <div className="min-w-0 text-[12px] leading-tight">
              <div className="font-medium text-admin-ink truncate">
                {userEmail || "Signed in"}
              </div>
              <div className="text-admin-ink-soft text-[11px] truncate">
                Owner
              </div>
            </div>
          </div>
          <div className="p-2 flex flex-col gap-0.5">
            <Link
              href="/"
              target="_blank"
              className="flex items-center gap-3 px-3 py-2 rounded-md text-[13px] text-admin-ink-soft hover:bg-admin-surface-2 hover:text-admin-ink transition-colors"
            >
              <ExternalLink className="h-4 w-4 text-admin-ink-faint" />
              <span>View Site</span>
            </Link>
            <button
              onClick={() => signOut({ callbackUrl: "/admin/login" })}
              className="flex items-center gap-3 px-3 py-2 rounded-md text-[13px] text-admin-ink-soft hover:bg-admin-surface-2 hover:text-admin-ink transition-colors text-left"
            >
              <LogOut className="h-4 w-4 text-admin-ink-faint" />
              <span>Sign Out</span>
            </button>
            <button
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 px-3 py-2 rounded-md text-[13px] text-admin-ink-faint hover:bg-admin-surface-2 hover:text-admin-ink-soft transition-colors text-left"
              aria-label="Hide sidebar"
            >
              <PanelLeftClose className="h-4 w-4" />
              <span>Hide sidebar</span>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
