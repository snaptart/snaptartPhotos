"use client";

import { useEffect, useRef } from "react";

/**
 * Marks the header it sits in with `data-scrolled` once the page has scrolled
 * past the header's own height, for a pinned header that shrinks or that
 * turns solid after lying over a photo (see .site-header in globals.css).
 */
export function HeaderScroll() {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const header = ref.current?.closest("header");
    if (!header) return;
    // Measured once: a shrinking header would otherwise move its own threshold.
    const threshold = Math.max(8, header.offsetHeight);
    const update = () => header.toggleAttribute("data-scrolled", window.scrollY > threshold);
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, []);

  return <span ref={ref} hidden />;
}
