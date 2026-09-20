"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { fontRole } from "@/lib/theme/role-style";

export default function PaginatedReader({ children }: { children: React.ReactNode }) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const flowRef = useRef<HTMLDivElement>(null);
  const [pageIndex, setPageIndex] = useState(0);
  const [pageCount, setPageCount] = useState(1);
  const [pageWidth, setPageWidth] = useState(0);
  const touchStartX = useRef<number | null>(null);

  const measure = useCallback(() => {
    const v = viewportRef.current;
    const f = flowRef.current;
    if (!v || !f) return;
    const w = v.clientWidth;
    setPageWidth(w);
    const totalW = f.scrollWidth;
    const count = Math.max(1, Math.round(totalW / w));
    setPageCount((prev) => {
      if (count !== prev) {
        setPageIndex((p) => Math.min(p, count - 1));
      }
      return count;
    });
  }, []);

  useLayoutEffect(() => {
    measure();
    const ro = new ResizeObserver(measure);
    if (viewportRef.current) ro.observe(viewportRef.current);
    if (flowRef.current) ro.observe(flowRef.current);
    window.addEventListener("load", measure);
    if (typeof document !== "undefined" && document.fonts) {
      document.fonts.ready.then(measure).catch(() => {});
    }
    return () => {
      ro.disconnect();
      window.removeEventListener("load", measure);
    };
  }, [measure]);

  const next = useCallback(
    () => setPageIndex((p) => Math.min(p + 1, pageCount - 1)),
    [pageCount]
  );
  const prev = useCallback(() => setPageIndex((p) => Math.max(0, p - 1)), []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLElement && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;
      if (e.key === "ArrowRight" || e.key === "PageDown" || e.key === " ") {
        e.preventDefault();
        next();
      } else if (e.key === "ArrowLeft" || e.key === "PageUp") {
        e.preventDefault();
        prev();
      } else if (e.key === "Home") {
        e.preventDefault();
        setPageIndex(0);
      } else if (e.key === "End") {
        e.preventDefault();
        setPageIndex(pageCount - 1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [next, prev, pageCount]);

  return (
    <div
      ref={viewportRef}
      style={{
        position: "fixed",
        inset: 0,
        overflow: "hidden",
        background: "var(--st-paper)",
        color: "var(--st-ink)",
      }}
      onTouchStart={(e) => {
        touchStartX.current = e.touches[0].clientX;
      }}
      onTouchEnd={(e) => {
        if (touchStartX.current == null) return;
        const dx = e.changedTouches[0].clientX - touchStartX.current;
        if (Math.abs(dx) > 50) {
          if (dx < 0) next();
          else prev();
        }
        touchStartX.current = null;
      }}
    >
      <button
        type="button"
        aria-label="Previous page"
        onClick={prev}
        disabled={pageIndex === 0}
        style={tapZoneStyle("left")}
      />
      <button
        type="button"
        aria-label="Next page"
        onClick={next}
        disabled={pageIndex >= pageCount - 1}
        style={tapZoneStyle("right")}
      />

      <div
        ref={flowRef}
        style={{
          height: "100%",
          columnWidth: pageWidth ? `${pageWidth}px` : "100vw",
          columnGap: 0,
          columnFill: "auto",
          transform: `translateX(${-pageIndex * pageWidth}px)`,
          transition: "transform 320ms cubic-bezier(.2,.9,.3,1)",
          willChange: "transform",
        }}
      >
        {children}
      </div>

      <div
        style={{
          position: "absolute",
          bottom: 14,
          left: 0,
          right: 0,
          textAlign: "center",
          color: "var(--st-ink-soft)",
          fontSize: 10,
          letterSpacing: 2.5,
          ...fontRole("labels"),
          zIndex: 6,
          pointerEvents: "none",
        }}
      >
        {pageIndex + 1} / {pageCount}
      </div>

      <NavButton dir="left" onClick={prev} disabled={pageIndex === 0} />
      <NavButton dir="right" onClick={next} disabled={pageIndex >= pageCount - 1} />
    </div>
  );
}

function tapZoneStyle(side: "left" | "right"): React.CSSProperties {
  return {
    position: "absolute",
    [side]: 0,
    top: 0,
    bottom: 0,
    width: "30%",
    zIndex: 5,
    background: "transparent",
    border: 0,
    cursor: side === "left" ? "w-resize" : "e-resize",
    padding: 0,
  };
}

function NavButton({
  dir,
  onClick,
  disabled,
}: {
  dir: "left" | "right";
  onClick: () => void;
  disabled: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={dir === "left" ? "Previous page" : "Next page"}
      style={{
        position: "absolute",
        [dir]: 14,
        bottom: 36,
        zIndex: 7,
        width: 40,
        height: 40,
        borderRadius: "50%",
        border: "1px solid var(--st-ink-faint)",
        background: "var(--st-paper)",
        color: "var(--st-ink)",
        cursor: disabled ? "default" : "pointer",
        opacity: disabled ? 0.3 : 0.85,
        transition: "opacity 160ms",
        ...fontRole("headings"),
        fontSize: 18,
        lineHeight: 1,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {dir === "left" ? "‹" : "›"}
    </button>
  );
}
