"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { User, Palette, Type, Navigation as NavIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const sections = [
  { href: "/admin/settings", label: "Identity", icon: User, match: /^\/admin\/settings\/?$/ },
  { href: "/admin/settings/look", label: "Look and Feel", icon: Palette, match: /^\/admin\/settings\/look/ },
  { href: "/admin/settings/typography", label: "Typography", icon: Type, match: /^\/admin\/settings\/typography/ },
  { href: "/admin/settings/navigation", label: "Navigation", icon: NavIcon, match: /^\/admin\/settings\/navigation/ },
];

export function SettingsSubNav() {
  const pathname = usePathname();
  return (
    <div className="flex flex-col gap-0.5">
      {sections.map((s) => {
        const active = s.match.test(pathname);
        const Icon = s.icon;
        return (
          <Link
            key={s.href}
            href={s.href}
            className={cn(
              "flex items-center gap-3 px-3 py-2 rounded-md text-[13px] transition-colors",
              active
                ? "bg-admin-accent-soft text-admin-ink font-medium"
                : "text-admin-ink-soft hover:bg-admin-surface-2 hover:text-admin-ink",
            )}
          >
            <Icon
              className={cn(
                "h-4 w-4 shrink-0",
                active ? "text-admin-accent" : "text-admin-ink-faint",
              )}
            />
            <span>{s.label}</span>
          </Link>
        );
      })}
    </div>
  );
}
