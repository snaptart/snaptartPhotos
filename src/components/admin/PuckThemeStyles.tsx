"use client";

import { useEffect, useState } from "react";
import { resolveTheme, type ThemeSettings } from "@/lib/theme/types";
import { buildGoogleFontsUrl } from "@/lib/theme/fonts";
import { buildThemeCssVars } from "@/lib/theme/css-vars";

interface ThemeRecord {
  id: string;
  themeSettings: Partial<ThemeSettings>;
}

/**
 * Puts the active theme's CSS variables and web fonts into the ADMIN document head
 * so the Puck preview renders in the site's real typography and colours.
 *
 * Without this the editor is unthemed: `--theme-*` is only emitted by
 * (public)/layout.tsx, so inside /admin every `var(--theme-color-rule, …)` and every
 * fontRole() lookup silently falls back to its default. The preview looked nothing
 * like the published page.
 *
 * Why appended imperatively rather than rendered as JSX: Puck renders its preview in
 * an iframe and mirrors host `style, link[rel="stylesheet"]` nodes into it, watching
 * document.head with a MutationObserver. Tags rendered in JSX land in <body>, where
 * Puck never looks. Appending to <head> gets them mirrored automatically — and the
 * link is cloned rather than inlined, so the cross-origin Google Fonts stylesheet
 * loads inside the iframe normally instead of tripping a CORS read of its rules.
 */
export default function PuckThemeStyles() {
  const [theme, setTheme] = useState<ThemeSettings | null>(null);

  useEffect(() => {
    let cancelled = false;

    Promise.all([fetch("/api/settings"), fetch("/api/themes")])
      .then(async ([settingsRes, themesRes]) => {
        const settings = await settingsRes.json();
        const themes: ThemeRecord[] = await themesRes.json();
        const active = settings?.activeThemeId
          ? themes.find((t) => t.id === settings.activeThemeId)
          : null;
        if (!cancelled) setTheme(resolveTheme(active?.themeSettings ?? null));
      })
      // No theme row, or the request failed: fall back to the defaults rather than
      // leaving the preview with no variables at all.
      .catch(() => {
        if (!cancelled) setTheme(resolveTheme(null));
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!theme) return;

    const style = document.createElement("style");
    style.setAttribute("data-puck-theme", "");
    style.textContent = buildThemeCssVars(theme);
    document.head.appendChild(style);

    const href = buildGoogleFontsUrl([
      theme.fontHeadings,
      theme.fontBody,
      theme.fontNavMenu,
      theme.fontFooter,
      theme.fontCaptions,
      theme.fontOverlay,
      theme.fontLabels,
    ]);

    let link: HTMLLinkElement | null = null;
    if (href) {
      link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = href;
      link.setAttribute("data-puck-theme", "");
      document.head.appendChild(link);
    }

    return () => {
      style.remove();
      link?.remove();
    };
  }, [theme]);

  return null;
}
