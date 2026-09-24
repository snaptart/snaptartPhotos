"use client";

import { useEffect, useState } from "react";
import { resolveTheme, type ThemeSettings } from "./types";

interface ThemeRecord {
  id: string;
  themeSettings: Partial<ThemeSettings>;
}

// One request per admin page load, however many controls ask for it.
let pending: Promise<ThemeSettings> | null = null;

function loadActiveTheme(): Promise<ThemeSettings> {
  if (!pending) {
    pending = Promise.all([fetch("/api/settings"), fetch("/api/themes")])
      .then(async ([settingsRes, themesRes]) => {
        const settings = await settingsRes.json();
        const themes: ThemeRecord[] = await themesRes.json();
        const active = settings?.activeThemeId
          ? themes.find((t) => t.id === settings.activeThemeId)
          : null;
        return resolveTheme(active?.themeSettings ?? null);
      })
      // No theme row, or the request failed: the defaults, rather than nothing.
      .catch(() => resolveTheme(null));
  }
  return pending;
}

/** The active preset, resolved. null until it has loaded. */
export function useActiveTheme(enabled = true): ThemeSettings | null {
  const [theme, setTheme] = useState<ThemeSettings | null>(null);
  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    loadActiveTheme().then((t) => {
      if (!cancelled) setTheme(t);
    });
    return () => {
      cancelled = true;
    };
  }, [enabled]);
  return theme;
}
