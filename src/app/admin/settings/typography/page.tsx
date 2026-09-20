"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { CURATED_FONTS, buildGoogleFontsUrl, getFontFallback } from "@/lib/theme/fonts";
import {
  THEME_DEFAULTS,
  resolveTheme,
  type FontRoleKey,
  type FontRoleStyle,
  type FontStylesMap,
  type ThemeSettings,
} from "@/lib/theme/types";
import ThemePreview from "@/components/admin/ThemePreview";
import LightboxPreview from "@/components/admin/LightboxPreview";
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
const MONO_FONTS = CURATED_FONTS.filter((f) => f.category === "mono");

type FontFields = Pick<
  ThemeSettings,
  | "fontHeadings"
  | "fontBody"
  | "fontNavMenu"
  | "fontFooter"
  | "fontCaptions"
  | "fontOverlay"
  | "fontLabels"
  | "bodyFontSize"
> & {
  fontStyles: FontStylesMap;
};

function pickFontFields(theme: ThemeSettings): FontFields {
  return {
    fontHeadings: theme.fontHeadings,
    fontBody: theme.fontBody,
    fontNavMenu: theme.fontNavMenu,
    fontFooter: theme.fontFooter,
    fontCaptions: theme.fontCaptions,
    fontOverlay: theme.fontOverlay,
    fontLabels: theme.fontLabels,
    fontStyles: theme.fontStyles ?? {},
    bodyFontSize: theme.bodyFontSize,
  };
}

const ROLE_META: {
  key: FontRoleKey;
  label: string;
  familyField: keyof Pick<
    ThemeSettings,
    | "fontHeadings"
    | "fontBody"
    | "fontNavMenu"
    | "fontFooter"
    | "fontCaptions"
    | "fontOverlay"
    | "fontLabels"
  >;
  hint?: string;
}[] = [
  { key: "headings", label: "Headings", familyField: "fontHeadings" },
  { key: "body", label: "Body", familyField: "fontBody" },
  { key: "navMenu", label: "Nav menu", familyField: "fontNavMenu" },
  { key: "footer", label: "Footer", familyField: "fontFooter" },
  { key: "captions", label: "Captions", familyField: "fontCaptions" },
  { key: "overlay", label: "Overlay text", familyField: "fontOverlay" },
  {
    key: "labels",
    label: "Small-caps labels",
    familyField: "fontLabels",
    hint:
      "Used on the Hall / Stories uppercase labels (PLAN VIEW · 1:1, CONTENTS). JetBrains Mono by default.",
  },
];

export default function TypographySettingsPage() {
  const [loaded, setLoaded] = useState(false);
  const [activeThemeId, setActiveThemeId] = useState<string | null>(null);
  const [activeThemeName, setActiveThemeName] = useState<string | null>(null);
  const [activeTheme, setActiveTheme] = useState<ThemeSettings>({
    ...THEME_DEFAULTS,
  });
  const [siteTitle, setSiteTitle] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
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
        setSiteTitle(settings?.siteTitle ?? "");
        setLogoUrl(settings?.logoUrl ?? "");
        const active = id ? themes.find((t) => t.id === id) : null;
        const merged: ThemeSettings = resolveTheme(active?.themeSettings ?? null);
        setActiveTheme(merged);
        setActiveThemeName(active?.name ?? null);
        setDraft(pickFontFields(merged));
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, []);

  const previewTheme: ThemeSettings = { ...activeTheme, ...draft };
  const draftFontsUrl = buildGoogleFontsUrl([
    draft.fontHeadings,
    draft.fontBody,
    draft.fontNavMenu,
    draft.fontFooter,
    draft.fontCaptions,
    draft.fontOverlay,
    draft.fontLabels,
  ]);

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
    <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,640px)_minmax(0,1fr)] xl:gap-10 gap-6">
      {draftFontsUrl && <link rel="stylesheet" href={draftFontsUrl} />}
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
        desc="Typeface pairings for each part of the public site. Expand a role to tweak weight, italic, caps, or size."
      >
        {ROLE_META.map((role) => (
          <FontRoleBlock
            key={role.key}
            label={role.label}
            hint={role.hint}
            family={draft[role.familyField] as string}
            onFamilyChange={(v) => update(role.familyField, v)}
            style={draft.fontStyles[role.key] ?? {}}
            onStyleChange={(patch) =>
              setDraft((d) => ({
                ...d,
                fontStyles: {
                  ...d.fontStyles,
                  [role.key]: { ...(d.fontStyles[role.key] ?? {}), ...patch },
                },
              }))
            }
          />
        ))}
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

      <aside className="xl:sticky xl:top-8 xl:self-start xl:max-h-[calc(100vh-4rem)] xl:overflow-y-auto space-y-5">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[2px] text-admin-ink-soft mb-2">
            Public pages
          </div>
          <ThemePreview theme={previewTheme} siteTitle={siteTitle} logoUrl={logoUrl} />
        </div>
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[2px] text-admin-ink-soft mb-2">
            Lightbox
          </div>
          <LightboxPreview theme={previewTheme} />
        </div>
      </aside>
    </div>
  );
}

function FontRoleBlock({
  label,
  hint,
  family,
  onFamilyChange,
  style,
  onStyleChange,
}: {
  label: string;
  hint?: string;
  family: string;
  onFamilyChange: (v: string) => void;
  style: FontRoleStyle;
  onStyleChange: (patch: FontRoleStyle) => void;
}) {
  const previewStyle: React.CSSProperties = {
    fontFamily: getFontFallback(family),
    fontWeight: style.weight ?? 400,
    fontStyle: style.italic ? "italic" : "normal",
    textTransform: style.uppercase ? "uppercase" : "none",
    fontSize: style.size ?? 15,
  };

  return (
    <Field label={label} inline hint={hint}>
      <div className="flex flex-col gap-2">
        <Select value={family} onChange={(e) => onFamilyChange(e.target.value)}>
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
          <optgroup label="Monospace">
            {MONO_FONTS.map((f) => (
              <option key={f.name} value={f.name}>
                {f.name}
              </option>
            ))}
          </optgroup>
        </Select>

        <div className="grid grid-cols-[auto_auto_auto_auto] gap-3 items-center text-[12px] text-admin-ink-soft">
          {/* Weight slider */}
          <label className="flex items-center gap-2">
            <span className="whitespace-nowrap">Weight {style.weight ?? 400}</span>
            <input
              type="range"
              min={300}
              max={800}
              step={100}
              value={style.weight ?? 400}
              onChange={(e) => onStyleChange({ weight: Number(e.target.value) })}
              className="w-20 accent-admin-accent"
            />
          </label>
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={!!style.italic}
              onChange={(e) => onStyleChange({ italic: e.target.checked })}
              className="accent-admin-accent"
            />
            <span className="italic">Italic</span>
          </label>
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={!!style.uppercase}
              onChange={(e) => onStyleChange({ uppercase: e.target.checked })}
              className="accent-admin-accent"
            />
            <span style={{ textTransform: "uppercase", letterSpacing: "1px" }}>Caps</span>
          </label>
          <label className="flex items-center gap-1.5">
            <span className="whitespace-nowrap">Size</span>
            <input
              type="number"
              min={8}
              max={200}
              placeholder="auto"
              value={style.size ?? ""}
              onChange={(e) => {
                const v = e.target.value.trim();
                onStyleChange({ size: v === "" ? null : Number(v) });
              }}
              className="w-14 bg-admin-surface border border-admin-border-strong rounded px-1.5 py-1 text-[12px]"
            />
            <span className="opacity-70">px</span>
          </label>
        </div>

        <p
          className="text-[13px] text-admin-ink mt-0.5"
          style={previewStyle}
        >
          The quick brown fox jumps over the lazy dog
        </p>
      </div>
    </Field>
  );
}
