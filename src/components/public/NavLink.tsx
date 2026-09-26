"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

const within = (pathname: string, path: string) => pathname === path || pathname.startsWith(`${path}/`);

/** "page" on the item's own page, "true" anywhere in its section, null elsewhere. */
export function currentState(pathname: string, url: string, sectionPaths: string[] = []): "page" | "true" | null {
  const path = pathname.replace(/\/+$/, "") || "/";
  const target = url.replace(/\/+$/, "") || "/";
  if (!target.startsWith("/")) return null; // external
  if (path === target) return "page";
  if (target !== "/" && within(path, target)) return "true";
  return sectionPaths.some((p) => within(path, p)) ? "true" : null;
}

/** A menu link that marks itself (aria-current) when it's the current page or section; style it with `aria-[current]:`. */
export function NavLink({
  href,
  sectionPaths,
  external,
  current: forced,
  className,
  onClick,
  children,
}: {
  href: string;
  sectionPaths?: string[];
  external?: boolean;
  /** Mark it current whatever the address (the admin's preview). */
  current?: boolean;
  className?: string;
  onClick?: () => void;
  children: ReactNode;
}) {
  const pathname = usePathname() ?? "/";
  const current = forced ? "page" : external ? null : currentState(pathname, href, sectionPaths);
  return (
    <Link
      href={href}
      onClick={onClick}
      aria-current={current ?? undefined}
      className={className}
      {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
    >
      {children}
    </Link>
  );
}
