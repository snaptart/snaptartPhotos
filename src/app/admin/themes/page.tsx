"use client";

import { useEffect, useState } from "react";
import ThemePreview from "@/components/admin/ThemePreview";
import { CURATED_FONTS } from "@/lib/theme/fonts";
import { THEME_DEFAULTS, type ThemeSettings } from "@/lib/theme/types";

interface SiteSettings {
  siteTitle: string;
  logoUrl: string | null;
  activeThemeId: string | null;
}

interface ThemeRecord {
  id: string;
  name: string;
  themeSettings: Partial<ThemeSettings>;
}

const SERIF_FONTS = CURATED_FONTS.filter((f) => f.category === "serif");
const SANS_FONTS = CURATED_FONTS.filter((f) => f.category === "sans-serif");
const DISPLAY_FONTS = CURATED_FONTS.filter((f) => f.category === "display");

export default function ThemesPage() {
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [themeList, setThemeList] = useState<ThemeRecord[]>([]);
  const [activeThemeId, setActiveThemeId] = useState<string | null>(null);
  const [themeDraft, setThemeDraft] = useState<ThemeSettings>({ ...THEME_DEFAULTS });
  const [themeName, setThemeName] = useState("Default");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((data) => {
        if (data) {
          setSettings(data);
          setActiveThemeId(data.activeThemeId ?? null);
        }
      });
    fetch("/api/themes")
      .then((r) => r.json())
      .then((data: ThemeRecord[]) => {
        setThemeList(data);
      });
  }, []);

  useEffect(() => {
    if (activeThemeId && themeList.length > 0) {
      const active = themeList.find((t) => t.id === activeThemeId);
      if (active) {
        setThemeDraft({ ...THEME_DEFAULTS, ...active.themeSettings });
        setThemeName(active.name);
      }
    }
  }, [activeThemeId, themeList]);

  function updateTheme<K extends keyof ThemeSettings>(key: K, value: ThemeSettings[K]) {
    setThemeDraft((d) => ({ ...d, [key]: value }));
  }

  async function handleSave() {
    setSaving(true);
    setMessage("");

    if (activeThemeId) {
      const res = await fetch(`/api/themes/${activeThemeId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: themeName, themeSettings: themeDraft }),
      });
      if (res.ok) {
        const updated = await res.json();
        setThemeList((list) => list.map((t) => (t.id === updated.id ? updated : t)));
        setMessage("Theme saved!");
      } else {
        setMessage("Failed to save theme");
      }
    } else {
      const res = await fetch("/api/themes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: themeName, themeSettings: themeDraft }),
      });
      if (res.ok) {
        const created = await res.json();
        setThemeList((list) => [...list, created]);
        setActiveThemeId(created.id);
        await fetch("/api/settings", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ activeThemeId: created.id }),
        });
        setMessage("Theme created and activated!");
      } else {
        setMessage("Failed to create theme");
      }
    }
    setSaving(false);
  }

  async function handleSaveAsNew() {
    setSaving(true);
    setMessage("");

    const res = await fetch("/api/themes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: `${themeName} (copy)`, themeSettings: themeDraft }),
    });
    if (res.ok) {
      const created = await res.json();
      setThemeList((list) => [...list, created]);
      setActiveThemeId(created.id);
      setThemeName(created.name);
      await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ activeThemeId: created.id }),
      });
      setMessage("Theme duplicated and activated!");
    } else {
      setMessage("Failed to duplicate theme");
    }
    setSaving(false);
  }

  async function handleDelete() {
    if (!activeThemeId) return;
    if (!confirm("Delete this theme? This cannot be undone.")) return;

    const res = await fetch(`/api/themes/${activeThemeId}`, { method: "DELETE" });
    if (res.ok) {
      setThemeList((list) => list.filter((t) => t.id !== activeThemeId));
      setActiveThemeId(null);
      setThemeDraft({ ...THEME_DEFAULTS });
      setThemeName("Default");
      await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ activeThemeId: null }),
      });
      setMessage("Theme deleted");
    }
  }

  async function handleSwitch(id: string) {
    setActiveThemeId(id);
    const theme = themeList.find((t) => t.id === id);
    if (theme) {
      setThemeDraft({ ...THEME_DEFAULTS, ...theme.themeSettings });
      setThemeName(theme.name);
    }
    await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ activeThemeId: id }),
    });
  }

  if (!settings) return <div className="text-neutral-500">Loading...</div>;

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold">Themes</h1>

      {message && (
        <div className={message.includes("Failed") ? "alert-error" : "alert-success"}>
          {message}
        </div>
      )}

      <div className="flex flex-col gap-6 lg:flex-row">
        {/* Theme Controls */}
        <div className="max-w-lg flex-1 space-y-4">
          {/* Theme Preset Selector */}
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <label className="mb-1 block text-sm font-medium text-neutral-700">Theme Preset</label>
              <select
                value={activeThemeId ?? ""}
                onChange={(e) => {
                  if (e.target.value) {
                    handleSwitch(e.target.value);
                  } else {
                    setActiveThemeId(null);
                    setThemeDraft({ ...THEME_DEFAULTS });
                    setThemeName("New Theme");
                  }
                }}
                className="input-base"
              >
                <option value="">— New Theme —</option>
                {themeList.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
            {activeThemeId && (
              <button type="button" onClick={handleDelete} className="btn-text text-red-500 hover:text-red-700">
                Delete
              </button>
            )}
          </div>

          {/* Theme Name */}
          <div>
            <label className="mb-1 block text-sm font-medium text-neutral-700">Theme Name</label>
            <input
              type="text"
              value={themeName}
              onChange={(e) => setThemeName(e.target.value)}
              className="input-base"
            />
          </div>

          {/* Fonts */}
          <div className="border-t border-neutral-200 pt-4">
            <h3 className="mb-3 text-base font-semibold text-neutral-800">Fonts</h3>
            <div className="space-y-3">
              <FontSelect label="Headings" value={themeDraft.fontHeadings} onChange={(v) => updateTheme("fontHeadings", v)} />
              <FontSelect label="Body" value={themeDraft.fontBody} onChange={(v) => updateTheme("fontBody", v)} />
              <FontSelect label="Nav Menu" value={themeDraft.fontNavMenu} onChange={(v) => updateTheme("fontNavMenu", v)} />
              <FontSelect label="Footer" value={themeDraft.fontFooter} onChange={(v) => updateTheme("fontFooter", v)} />
              <FontSelect label="Captions" value={themeDraft.fontCaptions} onChange={(v) => updateTheme("fontCaptions", v)} />
              <FontSelect label="Overlay Text" value={themeDraft.fontOverlay} onChange={(v) => updateTheme("fontOverlay", v)} />
            </div>
          </div>

          {/* Header / Navbar */}
          <div className="border-t border-neutral-200 pt-4">
            <h3 className="mb-3 text-base font-semibold text-neutral-800">Header</h3>
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-neutral-700">Logo Position</label>
                <RadioGroup
                  options={["left", "center", "right"]}
                  value={themeDraft.logoPosition}
                  onChange={(v) => updateTheme("logoPosition", v as ThemeSettings["logoPosition"])}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-neutral-700">
                  Logo Size — {themeDraft.logoSize}px
                </label>
                <input
                  type="range"
                  min={20}
                  max={80}
                  step={2}
                  value={themeDraft.logoSize}
                  onChange={(e) => updateTheme("logoSize", Number(e.target.value))}
                  className="w-full"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-neutral-700">
                  Menu Font Size — {themeDraft.menuFontSize}px
                </label>
                <input
                  type="range"
                  min={10}
                  max={24}
                  step={1}
                  value={themeDraft.menuFontSize}
                  onChange={(e) => updateTheme("menuFontSize", Number(e.target.value))}
                  className="w-full"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-neutral-700">Menu Position</label>
                <RadioGroup
                  options={["left", "center", "right"]}
                  value={themeDraft.menuJustify}
                  onChange={(v) => updateTheme("menuJustify", v as ThemeSettings["menuJustify"])}
                />
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="border-t border-neutral-200 pt-4">
            <h3 className="mb-3 text-base font-semibold text-neutral-800">Footer</h3>
            <div>
              <label className="mb-1 block text-sm font-medium text-neutral-700">
                Footer Font Size — {themeDraft.footerFontSize}px
              </label>
              <input
                type="range"
                min={10}
                max={24}
                step={1}
                value={themeDraft.footerFontSize}
                onChange={(e) => updateTheme("footerFontSize", Number(e.target.value))}
                className="w-full"
              />
            </div>
          </div>

          {/* Colors */}
          <div className="border-t border-neutral-200 pt-4">
            <h3 className="mb-3 text-base font-semibold text-neutral-800">Colors</h3>
            <div className="space-y-3">
              <ColorInput label="Site Background" value={themeDraft.colorSiteBg} onChange={(v) => updateTheme("colorSiteBg", v)} />
              <ColorInput label="Header Background" value={themeDraft.colorHeaderBg} onChange={(v) => updateTheme("colorHeaderBg", v)} />
              <ColorInput label="Footer Background" value={themeDraft.colorFooterBg} onChange={(v) => updateTheme("colorFooterBg", v)} />
              <ColorInput label="Footer Text Color" value={themeDraft.colorFooterText} onChange={(v) => updateTheme("colorFooterText", v)} />
              <ColorInput label="Text Color" value={themeDraft.colorText} onChange={(v) => updateTheme("colorText", v)} />
              <ColorInput label="Accent / Link Color" value={themeDraft.colorAccent} onChange={(v) => updateTheme("colorAccent", v)} />
              <ColorInput label="Gallery Captions" value={themeDraft.colorGalleryCaptions} onChange={(v) => updateTheme("colorGalleryCaptions", v)} />
              <ColorInput label="Lightbox Text" value={themeDraft.colorLightboxText} onChange={(v) => updateTheme("colorLightboxText", v)} />
              <ColorInput label="Hero Overlay Text" value={themeDraft.colorHeroOverlay} onChange={(v) => updateTheme("colorHeroOverlay", v)} />
            </div>
          </div>

          {/* Save Buttons */}
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={handleSave} disabled={saving} className="btn-primary">
              {saving ? "Saving..." : activeThemeId ? "Save Theme" : "Create Theme"}
            </button>
            {activeThemeId && (
              <button type="button" onClick={handleSaveAsNew} disabled={saving} className="btn-secondary">
                Save as New
              </button>
            )}
          </div>
        </div>

        {/* Live Preview */}
        <div className="lg:w-96">
          <label className="mb-2 block text-sm font-medium text-neutral-700">Preview</label>
          <div className="sticky top-8">
            <ThemePreview
              theme={themeDraft}
              siteTitle={settings.siteTitle}
              logoUrl={settings.logoUrl ?? ""}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Helper Components ─── */

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
    <div>
      <label className="mb-1 block text-sm font-medium text-neutral-700">{label}</label>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="input-base">
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
      </select>
      <p className="mt-1 text-xs text-neutral-400" style={{ fontFamily: `"${value}", serif` }}>
        The quick brown fox jumps over the lazy dog
      </p>
    </div>
  );
}

function RadioGroup({
  options,
  value,
  onChange,
}: {
  options: string[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex gap-4">
      {options.map((opt) => (
        <label key={opt} className="flex items-center gap-1.5 text-sm capitalize">
          <input
            type="radio"
            checked={value === opt}
            onChange={() => onChange(opt)}
          />
          {opt}
        </label>
      ))}
    </div>
  );
}

function ColorInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-neutral-700">{label}</label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-8 w-10 cursor-pointer rounded border border-neutral-300"
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="input-base w-28"
          maxLength={7}
        />
      </div>
    </div>
  );
}
