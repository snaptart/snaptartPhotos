"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

/**
 * A panel that slides in from the right for editing one thing (a page's
 * settings, a gallery) while the list stays in view behind it. Escape or a
 * click on the dimmed list closes it.
 */
export function Drawer({
  open,
  onClose,
  eyebrow,
  title,
  children,
  footer,
  width = 480,
}: {
  open: boolean;
  onClose: () => void;
  eyebrow?: ReactNode;
  title: ReactNode;
  children: ReactNode;
  /** Pinned under the scrolling body — usually Save / Cancel. */
  footer?: ReactNode;
  width?: number;
}) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    // Start typing straight away in the first field.
    const first = panelRef.current?.querySelector<HTMLElement>("input:not([type=hidden]), textarea, select");
    first?.focus({ preventScroll: true });
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-50 font-sans">
      <div className="absolute inset-0 bg-admin-ink/20" onClick={onClose} aria-hidden="true" />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        className="absolute inset-y-0 right-0 flex max-w-full flex-col border-l border-admin-border bg-admin-surface shadow-xl"
        style={{ width }}
      >
        <div className="flex items-start justify-between gap-4 border-b border-admin-border px-6 py-5">
          <div className="min-w-0">
            {eyebrow && (
              <div className="mb-1 font-mono text-[10px] uppercase tracking-[2px] text-admin-ink-soft">{eyebrow}</div>
            )}
            <h2 className="truncate font-serif text-[22px] italic leading-tight text-admin-ink">{title}</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="p-1 text-admin-ink-soft hover:text-admin-ink">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
        {footer && <div className="flex gap-2 border-t border-admin-border px-6 py-4">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}
