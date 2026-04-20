"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { CURATED_FONTS } from "@/lib/theme/fonts";
import { THEME_DEFAULTS, type ThemeSettings } from "@/lib/theme/types";
import { useMessage } from "@/lib/hooks/useMessage";
import { Button, Field, Select } from "@/components/admin/ui";
import { SettingGroup } from "@/components/admin/settings/SettingGroup";

interface ThemeRecord {
  id: string;
  name: string;
  themeSettings: Partial<ThemeSettings>;
}

const SERIF_FONTS = CURATED_FONTS.filter((f) => f.category === "serif");
const SANS_FONTS = CURATED_FONTS.filter((f) => f.category === "sans-serif");
const DISPLAY_FONTS = CURATED_FONTS.filter((f) => f.category === "display");

type FontFields = Pick<
  ThemeSettings,
  | "fontHeadings"
  | "fontBody"
  | "fontNavMenu"
  | "fontFooter"
  | "fontCaptions"
  | "fontOverlay"
  | "bodyFontSize"
>;

function pickFontFields(theme: ThemeSettings): FontFields {
  return {
    fontHeadings: theme.fontHeadings,
    fontBody: theme.fontBody,
    fontNavMenu: theme.fontNavMenu,
    fontFooter: theme.fontFooter,
    fontCaptions: theme.fontCaptions,
    fontOverlay: theme.fontOverlay,
    bodyFontSize: theme.bodyFontSize,
  };
}

export default function TypographySettingsPage() {
  const [loaded, setLoaded] = useState(false);
  const [activeThemeId, setActiveThemeId] = useState<string | null>(null);
  const [activeThemeName, setActiveThemeName] = useState<string | null>(null);
  const [activeTheme, setActiveTheme] = useState<ThemeSettings>({
    ...THEME_DEFAULTS,
  });
  const [draft, setDraft] = useState<FontFields>(() =>
    pickFontFields(THEME_DEFAULTS),
  );
  const [saving, setSaving] = useState(false);
  const { message, showSuccess, showError, clear, alertClass } = useMessage();

  useEffect(() => {
    Promise.all([fetch("/api/settings"), fetch("/api/themes")])
      .then(async ([settingsRes, themesRes]) => {
        const settings = await settingsRes.json();
        const themes: ThemeRecord[] = await themesRes.json();
        const id = settings?.activeThemeId ?? null;
        setActiveThemeId(id);
        const active = id ? themes.find((t) => t.id === id) : null;
        const merged: ThemeSettings = {
          ...THEME_DEFAULTS,
          ...(active?.themeSettings ?? {}),
        };
        setActiveTheme(merged);
        setActiveThemeName(active?.name ?? null);
        setDraft(pickFontFields(merged));
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, []);

  function update<K extends keyof FontFields>(key: K, value: FontFields[K]) {
    setDraft((d) => ({ ...d, [key]: value }));
  }

  async function handleSave() {
    if (!activeThemeId) {
      showError("Create a preset in Look and Feel first.");
      return;
    }
    setSaving(true);
    clear();
    const merged: ThemeSettings = { ...activeTheme, ...draft };
    const res = await fetch(`/api/themes/${activeThemeId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: activeThemeName ?? "Default",
        themeSettings: merged,
      }),
    });
    if (res.ok) {
      setActiveTheme(merged);
      showSuccess("Typography saved.");
    } else {
      showError("Failed to save.");
    }
    setSaving(false);
  }

  if (!loaded) return <div className="text-admin-ink-soft">Loading...</div>;

  return (
    <div>
      {message && <div className={`${alertClass} mb-4`}>{message.text}</div>}

      {/* Active preset banner */}
      <div className="mb-8 flex items-center justify-between gap-3 rounded-md border border-admin-border bg-admin-surface-2 px-4 py-3">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[2px] text-admin-ink-soft">
            Editing preset
          </div>
          <div className="font-serif italic text-[16px] text-admin-ink mt-0.5">
            {activeThemeName ?? "No active preset"}
          </div>
        </div>
        <Link
          href="/admin/settings/look"
          className="inline-flex items-center gap-1 text-[12px] text-admin-accent hover:underline"
        >
          Change preset
          <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      {!activeThemeId && (
        <div className="alert-error mb-6">
          There's no active theme preset. Visit{" "}
          <Link href="/admin/settings/look" className="underline">
            Look and Feel
          </Link>{" "}
          to create one before editing fonts.
        </div>
      )}

      <SettingGroup
        title="Fonts"
        desc="Typeface pairings for each part of the public site."
      >
        <FontSelect
          label="Headings"
          value={draft.fontHeadings}
          onChange={(v) => update("fontHeadings", v)}
        />
        <FontSelect
          label="Body"
          value={draft.fontBody}
          onChange={(v) => update("fontBody", v)}
        />
        <FontSelect
          label="Nav menu"
          value={draft.fontNavMenu}
          onChange={(v) => update("fontNavMenu", v)}
        />
        <FontSelect
          label="Footer"
          value={draft.fontFooter}
          onChange={(v) => update("fontFooter", v)}
        />
        <FontSelect
          label="Captions"
          value={draft.fontCaptions}
          onChange={(v) => update("fontCaptions", v)}
        />
        <FontSelect
          label="Overlay text"
          value={draft.fontOverlay}
          onChange={(v) => update("fontOverlay", v)}
        />
      </SettingGroup>

      <SettingGroup title="Scale" desc="Base size for body text.">
        <Field label={`Body font size — ${draft.bodyFontSize}px`} inline>
          <input
            type="range"
            min={12}
            max={24}
            step={1}
            value={draft.bodyFontSize}
            onChange={(e) =>
              update("bodyFontSize", Number(e.target.value))
            }
            className="w-full accent-admin-accent"
          />
        </Field>
      </SettingGroup>

      <div className="flex justify-end">
        <Button
          kind="primary"
          onClick={handleSave}
          disabled={saving || !activeThemeId}
        >
          {saving ? "Saving..." : "Save typography"}
        </Button>
      </div>
    </div>
  );
}

function FontSelect({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <Field label={label} inline>
      <div>
        <Select value={value} onChange={(e) => onChange(e.target.value)}>
          <optgroup label="Serif">
            {SERIF_FONTS.map((f) => (
              <option key={f.name} value={f.name}>
                {f.name}
              </option>
            ))}
          </optgroup>
          <optgroup label="Sans-Serif">
            {SANS_FONTS.map((f) => (
              <option key={f.name} value={f.name}>
                {f.name}
              </option>
            ))}
          </optgroup>
          <optgroup label="Display">
            {DISPLAY_FONTS.map((f) => (
              <option key={f.name} value={f.name}>
                {f.name}
              </option>
            ))}
          </optgroup>
        </Select>
        <p
          className="mt-1 text-[12px] text-admin-ink-faint"
          style={{ fontFamily: `"${value}", serif` }}
        >
          The quick brown fox jumps over the lazy dog
        </p>
      </div>
    </Field>
  );
}
