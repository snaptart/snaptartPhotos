"use client";

import { useEffect } from "react";
import { CURATED_FONTS, buildGoogleFontsUrl } from "./fonts";

const FONTS_LINK_ID = "curated-fonts";

/**
 * Loads every curated font, for admin font pickers and their previews. Goes in <head>
 * rather than the component tree because Puck mirrors the host document's head into
 * its preview iframe, so the preview picks the fonts up too.
 */
export function useCuratedFonts() {
  useEffect(() => {
    if (document.getElementById(FONTS_LINK_ID)) return;
    const link = document.createElement("link");
    link.id = FONTS_LINK_ID;
    link.rel = "stylesheet";
    link.href = buildGoogleFontsUrl(CURATED_FONTS.map((f) => f.name));
    document.head.appendChild(link);
  }, []);
}
