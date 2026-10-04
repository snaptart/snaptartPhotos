"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

/** px scrolled down before a shrinking header shrinks, and back up before it grows again. */
const SHRINK_AT = 24;
const GROW_AT = 8;

/**
 * Marks the header it sits in with `data-scrolled` once the page has scrolled,
 * for a pinned header that shrinks or that turns solid after lying over a
 * photo (see .site-header in globals.css).
 *
 * A shrinking header keeps the room it gave up as space below it, so the page
 * doesn't move up under it, and doesn't get shorter (which on a page barely
 * taller than the window would scroll it back to the top and grow the header
 * again).
 */
export function HeaderScroll() {
  const ref = useRef<HTMLSpanElement>(null);
  const pathname = usePathname();

  useEffect(() => {
    const header = ref.current?.closest("header");
    if (!header) return;
    const shrinks = header.hasAttribute("data-shrink");
    // Over a photo the header takes no room, and turns solid once the page has scrolled past it.
    let overPhoto = false;
    try {
      overPhoto = header.matches(".site-shell:has([data-header-over-photo]) .site-header[data-over-photo]");
    } catch {
      // A browser without :has doesn't lay the header over the photo either.
    }

    // The header's height full size and shrunk, measured without animating.
    const measure = () => {
      const was = header.hasAttribute("data-scrolled");
      header.setAttribute("data-measuring", "");
      header.removeAttribute("data-scrolled");
      const full = header.offsetHeight;
      header.setAttribute("data-scrolled", "");
      const small = header.offsetHeight;
      header.toggleAttribute("data-scrolled", was);
      void header.offsetHeight;
      header.removeAttribute("data-measuring");
      return { full, small };
    };
    const keepRoom = shrinks && !overPhoto;
    const room = () => {
      const { full, small } = measure();
      return full > small ? `${full - small}px` : "";
    };

    const set = (scrolled: boolean) => {
      if (scrolled === header.hasAttribute("data-scrolled")) return;
      const margin = scrolled && keepRoom ? room() : "";
      header.toggleAttribute("data-scrolled", scrolled);
      header.style.marginBottom = margin;
    };

    const threshold = overPhoto ? Math.max(8, measure().full) : null;
    const update = () => {
      const y = window.scrollY;
      if (threshold !== null) set(y > threshold);
      else if (y > SHRINK_AT) set(true);
      else if (y < GROW_AT) set(false);
    };
    // The header's sizes change with the window; and this page may differ from the last one.
    const refresh = () => {
      if (header.hasAttribute("data-scrolled")) header.style.marginBottom = keepRoom ? room() : "";
    };

    refresh();
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", refresh);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", refresh);
    };
  }, [pathname]);

  return <span ref={ref} hidden />;
}
