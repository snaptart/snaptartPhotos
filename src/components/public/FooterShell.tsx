"use client";

import { useEffect, useRef, useState } from "react";
import { parseLinks } from "@/lib/parseLinks";

interface FooterShellProps {
  footerText: string | null;
  contactEmail: string | null;
}

export function FooterShell({
  footerText,
  contactEmail,
}: FooterShellProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const body = (
    <>
      {footerText && <p className="break-words">{parseLinks(footerText)}</p>}
      {contactEmail && (
        <p className="mt-1">
          <a
            href={`mailto:${contactEmail}`}
            className="transition-colors hover:opacity-80"
            style={{ color: "var(--theme-color-accent)" }}
          >
            {contactEmail}
          </a>
        </p>
      )}
    </>
  );

  return (
    <div
      ref={containerRef}
      className="pointer-events-none fixed bottom-4 right-4 z-40 flex flex-col items-end"
    >
      {open && (
        <div
          role="dialog"
          aria-label="Site info"
          className="pointer-events-auto mb-2 max-w-xs rounded-lg border border-neutral-200 px-4 py-3 text-left shadow-lg"
          style={{
            backgroundColor: "var(--theme-color-footer-bg)",
            fontFamily: "var(--theme-font-footer-family, var(--theme-font-footer))",
            fontSize: "var(--theme-font-footer-size, var(--theme-footer-font-size))",
            color: "var(--theme-color-footer-text)",
          }}
        >
          {body}
        </div>
      )}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Close site info" : "Open site info"}
        aria-expanded={open}
        className="pointer-events-auto flex h-8 w-8 items-center justify-center rounded-full border border-neutral-300 bg-white/70 text-sm font-serif italic shadow-sm backdrop-blur transition-opacity hover:opacity-100 focus:opacity-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400"
        style={{
          color: "var(--theme-color-text)",
          opacity: open ? 1 : 0.55,
        }}
      >
        {open ? "×" : "i"}
      </button>
    </div>
  );
}
