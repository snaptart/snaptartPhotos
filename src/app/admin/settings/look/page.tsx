"use client";

import { useEffect, useState } from "react";
import { DEFAULT_LIGHTBOX_SETTINGS } from "@/components/public/Lightbox";
import { useMessage } from "@/lib/hooks/useMessage";
import siteConfig from "@/lib/site.config";
import { THEME_DEFAULTS, resolveTheme, type ThemeSettings } from "@/lib/theme/types";
import {
  Button,
  Field,
  Input,
  Select,
  SectionLabel,
} from "@/components/admin/ui";
import { SettingGroup } from "@/components/admin/settings/SettingGroup";
import ThemePreview from "@/components/admin/ThemePreview";
import LightboxPreview from "@/components/admin/LightboxPreview";

interface ThemeRecord {
  id: string;
  name: string;
  themeSettings: Partial<ThemeSettings>;
}

interface LightboxDraft {
  metadataFields: string[];
  cornerRadius: number;
  captionPosition: string;
  fadeSpeed: string;
  captionAlignment: string;
}

const LIGHTBOX_DEFAULT: LightboxDraft = {
  metadataFields: DEFAULT_LIGHTBOX_SETTINGS.metadataFields,
  cornerRadius: DEFAULT_LIGHTBOX_SETTINGS.cornerRadius,
  captionPosition: DEFAULT_LIGHTBOX_SETTINGS.captionPosition,
  fadeSpeed: DEFAULT_LIGHTBOX_SETTINGS.fadeSpeed,
  captionAlignment: DEFAULT_LIGHTBOX_SETTINGS.captionAlignment,
};

const LIGHTBOX_METADATA_OPTIONS = siteConfig.lightboxMetadataOptions.filter(
  (o) => o.enabled,
);

export default function LookAndFeelPage() {
  const [loaded, setLoaded] = useState(false);
  const [themeList, setThemeList] = useState<ThemeRecord[]>([]);
  const [activeThemeId, setActiveThemeId] = useState<string | null>(null);
  const [themeDraft, setThemeDraft] = useState<ThemeSettings>({
    ...THEME_DEFAULTS,
  });
  const [themeName, setThemeName] = useState("Default");
  const [lightbox, setLightbox] = useState<LightboxDraft>(LIGHTBOX_DEFAULT);
  const [footerAlignment, setFooterAlignment] = useState<string>("center");
  const [siteTitle, setSiteTitle] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const { message, showSuccess, showError, clear, alertClass } = useMessage();

  useEffect(() => {
    Promise.all([fetch("/api/settings"), fetch("/api/themes")])
      .then(async ([settingsRes, themesRes]) => {
        const settings = await settingsRes.json();
        const themes: ThemeRecord[] = await themesRes.json();
        setThemeList(themes);
        setActiveThemeId(settings?.activeThemeId ?? null);
        setSiteTitle(settings?.siteTitle ?? "");
        setLogoUrl(settings?.logoUrl ?? "");
        if (settings) {
          setLightbox({
            metadataFields:
              settings.lightboxMetadataFields ?? LIGHTBOX_DEFAULT.metadataFields,
            cornerRadius:
              settings.lightboxCornerRadius ?? LIGHTBOX_DEFAULT.cornerRadius,
            captionPosition:
              settings.lightboxCaptionPosition ??
              LIGHTBOX_DEFAULT.captionPosition,
            fadeSpeed:
              settings.lightboxFadeSpeed ?? LIGHTBOX_DEFAULT.fadeSpeed,
            captionAlignment:
              settings.lightboxCaptionAlignment ??
              LIGHTBOX_DEFAULT.captionAlignment,
          });
          setFooterAlignment(settings.footerAlignment ?? "center");
        }
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, []);

  useEffect(() => {
    if (activeThemeId && themeList.length > 0) {
      const active = themeList.find((t) => t.id === activeThemeId);
      if (active) {
        setThemeDraft(resolveTheme(active.themeSettings));
        setThemeName(active.name);
      }
    } else if (!activeThemeId) {
      setThemeDraft(resolveTheme(null));
      setThemeName("Default");
    }
  }, [activeThemeId, themeList]);

  function updateTheme<K extends keyof ThemeSettings>(
    key: K,
    value: ThemeSettings[K],
  ) {
    setThemeDraft((d) => ({ ...d, [key]: value }));
  }

  function updateLightbox<K extends keyof LightboxDraft>(
    key: K,
    value: LightboxDraft[K],
  ) {
    setLightbox((l) => ({ ...l, [key]: value }));
  }

  async function handleSave() {
    setSaving(true);
    clear();
    try {
      // Save theme
      if (activeThemeId) {
        const res = await fetch(`/api/themes/${activeThemeId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: themeName, themeSettings: themeDraft }),
        });
        if (res.ok) {
          const updated = await res.json();
          setThemeList((list) =>
            list.map((t) => (t.id === updated.id ? updated : t)),
          );
        } else {
          showError("Failed to save theme.");
          setSaving(false);
          return;
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
        } else {
          showError("Failed to create theme.");
          setSaving(false);
          return;
        }
      }

      // Save lightbox + footer alignment
      const lbRes = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          activeThemeId,
          footerAlignment,
          lightboxMetadataFields: lightbox.metadataFields,
          lightboxCornerRadius: lightbox.cornerRadius,
          lightboxCaptionPosition: lightbox.captionPosition,
          lightboxFadeSpeed: lightbox.fadeSpeed,
          lightboxCaptionAlignment: lightbox.captionAlignment,
        }),
      });
      if (!lbRes.ok) {
        showError("Failed to save lightbox settings.");
        setSaving(false);
        return;
      }

      showSuccess("Look and feel saved.");
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveAsNew() {
    setSaving(true);
    const res = await fetch("/api/themes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: `${themeName} (copy)`,
        themeSettings: themeDraft,
      }),
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
      showSuccess("Theme duplicated and activated.");
    } else {
      showError("Failed to duplicate theme.");
    }
    setSaving(false);
  }

  async function handleDelete() {
    if (!activeThemeId) return;
    if (!confirm("Delete this theme preset? This cannot be undone.")) return;
    const res = await fetch(`/api/themes/${activeThemeId}`, {
      method: "DELETE",
    });
    if (res.ok) {
      setThemeList((list) => list.filter((t) => t.id !== activeThemeId));
      setActiveThemeId(null);
      await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ activeThemeId: null }),
      });
      showSuccess("Theme deleted.");
    }
  }

  async function handleSwitch(id: string) {
    setActiveThemeId(id);
    await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ activeThemeId: id }),
    });
  }

  if (!loaded) return <div className="text-admin-ink-soft">Loading...</div>;

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,640px)_minmax(0,1fr)] xl:gap-10 gap-6">
      <div>
      {message && <div className={`${alertClass} mb-4`}>{message.text}</div>}

      {/* Theme preset */}
      <SettingGroup
        title="Theme preset"
        desc="All Look and Feel plus Typography settings save to the active preset."
      >
        <Field label="Active preset" inline>
          <div className="flex items-center gap-2">
            <Select
              value={activeThemeId ?? ""}
              onChange={(e) => {
                if (e.target.value) handleSwitch(e.target.value);
                else setActiveThemeId(null);
              }}
              className="flex-1"
            >
              <option value="">— New preset —</option>
              {themeList.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </Select>
            {activeThemeId && (
              <>
                <Button
                  kind="ghost"
                  size="sm"
                  type="button"
                  onClick={handleSaveAsNew}
                  disabled={saving}
                >
                  Save as new
                </Button>
                <Button
                  kind="danger"
                  size="sm"
                  type="button"
                  onClick={handleDelete}
                  disabled={saving}
                >
                  Delete
                </Button>
              </>
            )}
          </div>
        </Field>
        <Field label="Preset name" htmlFor="themeName" inline>
          <Input
            id="themeName"
            value={themeName}
            onChange={(e) => setThemeName(e.target.value)}
          />
        </Field>
      </SettingGroup>

      {/* Logo */}
      <SettingGroup
        title="Logo"
        desc="Where your logo sits in the header. Upload the logo itself in Identity."
      >
        <Field label="Position" inline>
          <RadioGroup
            options={["left", "center", "right"]}
            value={themeDraft.logoPosition}
            onChange={(v) =>
              updateTheme("logoPosition", v as ThemeSettings["logoPosition"])
            }
          />
        </Field>
        <Field label={`Size — ${themeDraft.logoSize}px`} inline>
          <input
            type="range"
            min={20}
            max={400}
            step={2}
            value={themeDraft.logoSize}
            onChange={(e) => updateTheme("logoSize", Number(e.target.value))}
            className="w-full accent-admin-accent"
          />
        </Field>
      </SettingGroup>

      {/* Menu layout */}
      <SettingGroup title="Menu" desc="How the navigation menu appears in the header. Size is set in Typography.">
        <Field label="Position" inline>
          <RadioGroup
            options={["left", "center", "right"]}
            value={themeDraft.menuJustify}
            onChange={(v) =>
              updateTheme("menuJustify", v as ThemeSettings["menuJustify"])
            }
          />
        </Field>
      </SettingGroup>

      {/* Footer */}
      <SettingGroup title="Footer" desc="Footer alignment on the public site. Size is set in Typography.">
        <Field label="Position" inline>
          <RadioGroup
            options={["left", "center", "right"]}
            value={footerAlignment}
            onChange={(v) => setFooterAlignment(v)}
          />
        </Field>
      </SettingGroup>

      {/* Colors */}
      <SettingGroup title="Colors" desc="Palette for the public site.">
        <ColorField
          label="Site background"
          value={themeDraft.colorSiteBg}
          onChange={(v) => updateTheme("colorSiteBg", v)}
          allowTransparent
        />
        <ColorField
          label="Header background"
          value={themeDraft.colorHeaderBg}
          onChange={(v) => updateTheme("colorHeaderBg", v)}
          allowTransparent
        />
        <ColorField
          label="Footer background"
          value={themeDraft.colorFooterBg}
          onChange={(v) => updateTheme("colorFooterBg", v)}
          allowTransparent
        />
        <ColorField
          label="Footer text"
          value={themeDraft.colorFooterText}
          onChange={(v) => updateTheme("colorFooterText", v)}
        />
        <ColorField
          label="Text"
          value={themeDraft.colorText}
          onChange={(v) => updateTheme("colorText", v)}
        />
        <ColorField
          label="Accent / link"
          value={themeDraft.colorAccent}
          onChange={(v) => updateTheme("colorAccent", v)}
        />
        <ColorField
          label="Gallery captions"
          value={themeDraft.colorGalleryCaptions}
          onChange={(v) => updateTheme("colorGalleryCaptions", v)}
        />
        <ColorField
          label="Lightbox text"
          value={themeDraft.colorLightboxText}
          onChange={(v) => updateTheme("colorLightboxText", v)}
        />
        <ColorField
          label="Hero overlay text"
          value={themeDraft.colorHeroOverlay}
          onChange={(v) => updateTheme("colorHeroOverlay", v)}
        />
      </SettingGroup>

      {/* Lightbox */}
      <SettingGroup
        title="Lightbox"
        desc="How photos appear when a visitor clicks a thumbnail."
      >
        <Field label="Metadata shown" inline>
          <div className="flex flex-col gap-1.5">
            {LIGHTBOX_METADATA_OPTIONS.map((opt) => (
              <label
                key={opt.key}
                className="flex items-center gap-2 text-[13px] text-admin-ink cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={lightbox.metadataFields.includes(opt.key)}
                  onChange={(e) => {
                    const fields = e.target.checked
                      ? [...lightbox.metadataFields, opt.key]
                      : lightbox.metadataFields.filter((k) => k !== opt.key);
                    updateLightbox("metadataFields", fields);
                  }}
                  className="accent-admin-accent"
                />
                {opt.label}
              </label>
            ))}
          </div>
        </Field>
        <Field label={`Corner radius — ${lightbox.cornerRadius}px`} inline>
          <input
            type="range"
            min={0}
            max={32}
            step={1}
            value={lightbox.cornerRadius}
            onChange={(e) =>
              updateLightbox("cornerRadius", Number(e.target.value))
            }
            className="w-full accent-admin-accent"
          />
        </Field>
        <Field label="Caption position" inline>
          <Select
            value={lightbox.captionPosition}
            onChange={(e) => updateLightbox("captionPosition", e.target.value)}
          >
            <option value="below">Below image</option>
            <option value="overlay-top">Overlay — top</option>
            <option value="overlay-bottom">Overlay — bottom</option>
          </Select>
        </Field>
        <Field label="Fade speed" inline>
          <Select
            value={lightbox.fadeSpeed}
            onChange={(e) => updateLightbox("fadeSpeed", e.target.value)}
          >
            <option value="none">None (instant)</option>
            <option value="fast">Fast (150ms)</option>
            <option value="medium">Medium (300ms)</option>
            <option value="slow">Slow (500ms)</option>
          </Select>
        </Field>
        <Field label="Caption alignment" inline>
          <Select
            value={lightbox.captionAlignment}
            onChange={(e) => updateLightbox("captionAlignment", e.target.value)}
          >
            <option value="left">Left</option>
            <option value="center">Center</option>
            <option value="right">Right</option>
          </Select>
        </Field>
      </SettingGroup>

      <div className="flex justify-end">
        <Button kind="primary" onClick={handleSave} disabled={saving}>
          {saving ? "Saving..." : activeThemeId ? "Save changes" : "Create preset"}
        </Button>
      </div>

      <p className="mt-4 text-[12px] text-admin-ink-soft">
        <SectionLabel className="inline">Typography</SectionLabel> — fonts live
        in the{" "}
        <a href="/admin/settings/typography" className="text-admin-accent hover:underline">
          Typography
        </a>{" "}
        section and save to the same preset.
      </p>
      </div>

      <aside className="xl:sticky xl:top-8 xl:self-start xl:max-h-[calc(100vh-4rem)] xl:overflow-y-auto space-y-5">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[2px] text-admin-ink-soft mb-2">
            Public pages
          </div>
          <ThemePreview theme={themeDraft} siteTitle={siteTitle} logoUrl={logoUrl} />
        </div>
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[2px] text-admin-ink-soft mb-2">
            Lightbox
          </div>
          <LightboxPreview theme={themeDraft} />
        </div>
      </aside>
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
        <label
          key={opt}
          className="flex items-center gap-1.5 text-[13px] text-admin-ink capitalize cursor-pointer"
        >
          <input
            type="radio"
            checked={value === opt}
            onChange={() => onChange(opt)}
            className="accent-admin-accent"
          />
          {opt}
        </label>
      ))}
    </div>
  );
}

function ColorField({
  label,
  value,
  onChange,
  allowTransparent,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  allowTransparent?: boolean;
}) {
  const isTransparent = value === "transparent";
  return (
    <Field label={label} inline>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={isTransparent ? "#ffffff" : value}
          onChange={(e) => onChange(e.target.value)}
          disabled={isTransparent}
          className="h-9 w-10 cursor-pointer rounded-md border border-admin-border-strong disabled:cursor-not-allowed disabled:opacity-50"
        />
        <Input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={isTransparent}
          className="w-32"
          maxLength={11}
        />
        {allowTransparent && (
          <label className="flex items-center gap-1.5 text-[13px] text-admin-ink cursor-pointer">
            <input
              type="checkbox"
              checked={isTransparent}
              onChange={(e) =>
                onChange(e.target.checked ? "transparent" : "#ffffff")
              }
              className="accent-admin-accent"
            />
            Transparent
          </label>
        )}
      </div>
    </Field>
  );
}
