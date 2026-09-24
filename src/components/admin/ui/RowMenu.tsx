"use client";

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

export type RowMenuItem =
  | {
      label: string;
      icon?: ReactNode;
      onSelect?: () => void;
      /** A link instead of an action. */
      href?: string;
      external?: boolean;
      danger?: boolean;
      hidden?: boolean;
    }
  | "divider";

/**
 * The "…" menu at the end of a list row: the actions a row needs now and then
 * (duplicate, publish, delete…), kept out of the way of the ones used daily.
 * Drawn in a portal so a card's rounded, clipped corners can't cut it off.
 */
export function RowMenu({ items, label = "More actions" }: { items: RowMenuItem[]; label?: string }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; right: number; up: boolean } | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const place = () => {
    const r = buttonRef.current?.getBoundingClientRect();
    if (!r) return;
    // Open upward when the row is near the bottom of the window.
    const up = window.innerHeight - r.bottom < 240;
    setPos({ top: up ? r.top - 4 : r.bottom + 4, right: window.innerWidth - r.right, up });
  };

  useLayoutEffect(() => {
    if (open) place();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const close = (e: Event) => {
      if (e.type === "keydown" && (e as KeyboardEvent).key !== "Escape") return;
      if (e.type === "mousedown" && (menuRef.current?.contains(e.target as Node) || buttonRef.current?.contains(e.target as Node))) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    window.addEventListener("resize", close);
    window.addEventListener("scroll", close, true);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
      window.removeEventListener("resize", close);
      window.removeEventListener("scroll", close, true);
    };
  }, [open]);

  const shown = items.filter((it) => it === "divider" || !it.hidden);
  const itemClass = (danger?: boolean) =>
    cn(
      "flex w-full items-center gap-2 px-3 py-1.5 text-left text-[13px] transition-colors",
      danger ? "text-admin-danger hover:bg-admin-danger/5" : "text-admin-ink hover:bg-admin-surface-2",
    );

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "inline-flex h-7 w-7 items-center justify-center rounded-md border text-admin-ink-soft transition-colors hover:bg-admin-surface-2 hover:text-admin-ink",
          open ? "border-admin-border-strong bg-admin-surface-2 text-admin-ink" : "border-transparent",
        )}
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>
      {open &&
        pos &&
        createPortal(
          <div
            ref={menuRef}
            role="menu"
            className="fixed z-[60] min-w-[180px] rounded-md border border-admin-border-strong bg-admin-surface py-1 font-sans shadow-lg"
            style={{ right: pos.right, ...(pos.up ? { bottom: window.innerHeight - pos.top } : { top: pos.top }) }}
          >
            {shown.map((it, i) =>
              it === "divider" ? (
                <div key={`d${i}`} className="my-1 border-t border-admin-border" />
              ) : it.href ? (
                <a
                  key={it.label}
                  role="menuitem"
                  href={it.href}
                  className={itemClass(it.danger)}
                  onClick={() => setOpen(false)}
                  {...(it.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                >
                  {it.icon && <span className="text-admin-ink-soft">{it.icon}</span>}
                  {it.label}
                </a>
              ) : (
                <button
                  key={it.label}
                  role="menuitem"
                  type="button"
                  className={itemClass(it.danger)}
                  onClick={() => {
                    setOpen(false);
                    it.onSelect?.();
                  }}
                >
                  {it.icon && <span className={it.danger ? "" : "text-admin-ink-soft"}>{it.icon}</span>}
                  {it.label}
                </button>
              ),
            )}
          </div>,
          document.body,
        )}
    </>
  );
}
