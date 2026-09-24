"use client";

import { useEffect, useState } from "react";
import { DEFAULT_LIGHTBOX_SETTINGS, type LightboxSettings } from "@/components/public/Lightbox";
import { useMessage } from "@/lib/hooks/useMessage";
import siteConfig from "@/lib/site.config";
import { THEME_DEFAULTS, resolveTheme, type ThemeSettings } from "@/lib/theme/types";
import { Textarea,
  Button,
  Field,
  Input,
  Select,
  SectionLabel,
} from "@/components/admin/ui";
import { SettingGroup } from "@/components/admin/settings/SettingGroup";
import {
  PreviewCard,
  SettingsTabs,
  SettingsWithPreview,
  useSettingsTab,
} from "@/components/admin/settings/SettingsPreview";

const TABS = [
  { key: "chrome", label: "Header & footer" },
  { key: "colors", label: "Colours" },
  { key: "lightbox", label: "Lightbox" },
] as const;
type Tab = (typeof TABS)[number]["key"];
import { ColorControl } from "@/components/admin/controls";
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
  const [footerText, setFooterText] = useState<string>("");
  const [tab, setTab] = useSettingsTab<Tab>("admin-look-tab", TABS.map((x) => x.key), "chrome");
  // A link to #footer (from Navigation) opens the tab it's on.
  useEffect(() => {
    if (loaded && window.location.hash === "#footer") {
      setTab("chrome");
      requestAnimationFrame(() => document.getElementById("footer")?.scrollIntoView());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded]);
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
          setFooterText(settings.footerText ?? "");
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
          footerText: footerText || null,
          lightboxMetadataFields: lightbox.metadataFields,
          lightboxCornerRadius: lightbox.cornerRadius,
          lightboxCaptionPosition: lightbox.captionPosition,
          lightboxFadeSpeed: lightbox.fadeSpeed,
          lightboxCaptionAlignment: lightbox.captionAlignment,
        }),
      });
      if (!lbRes.ok) {
        showError("Failed to save the footer and lightbox settings.");
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
      const activated = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ activeThemeId: created.id }),
      });
      if (activated.ok) showSuccess("Theme duplicated and activated.");
      else showError("Theme duplicated, but couldn't make it the site's preset.");
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
    } else {
      showError("Failed to delete the theme.");
    }
  }

  // Edits to the preset that aren't saved yet; switching presets would drop them.
  const savedPreset = themeList.find((t) => t.id === activeThemeId);
  const presetDirty =
    JSON.stringify(themeDraft) !== JSON.stringify(resolveTheme(savedPreset?.themeSettings ?? null)) ||
    (!!savedPreset && themeName !== savedPreset.name);

  function confirmDiscard(): boolean {
    return (
      !presetDirty ||
      confirm(`You have unsaved changes to "${themeName}". Switching presets throws them away. Switch anyway?`)
    );
  }

  async function handleSwitch(id: string) {
    setActiveThemeId(id);
    const res = await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ activeThemeId: id }),
    });
    if (!res.ok) showError("Couldn't switch the site to that preset.");
  }

  if (!loaded) return <div className="text-admin-ink-soft">Loading...</div>;

  const settings = (
    <>
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
                if (!confirmDiscard()) return;
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

      <SettingsTabs tabs={TABS} value={tab} onChange={setTab} />

      {tab === "chrome" && (
      <>
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
        <Field
          label="Wordmark"
          inline
          hint="How the site title is set when there's no logo image. Leave size blank to follow the logo size."
        >
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[12px] text-admin-ink-soft">
            <label className="flex items-center gap-1.5">
              Size
              <Input
                type="number"
                min={10}
                max={80}
                placeholder="auto"
                value={themeDraft.wordmarkSize ?? ""}
                onChange={(e) => {
                  const v = e.target.value.trim();
                  updateTheme("wordmarkSize", v === "" ? null : Number(v));
                }}
                className="w-20"
              />
              px
            </label>
            <label className="flex items-center gap-1.5">
              Weight
              <Select
                value={themeDraft.wordmarkWeight}
                onChange={(e) => updateTheme("wordmarkWeight", Number(e.target.value))}
                className="w-24"
              >
                {[300, 400, 500, 600, 700, 800].map((w) => (
                  <option key={w} value={w}>
                    {w}
                  </option>
                ))}
              </Select>
            </label>
            <label className="flex items-center gap-1.5">
              Tracking
              <Input
                type="number"
                min={-0.05}
                max={0.5}
                step={0.01}
                value={themeDraft.wordmarkTracking}
                onChange={(e) => updateTheme("wordmarkTracking", Number(e.target.value) || 0)}
                className="w-20"
              />
              em
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={themeDraft.wordmarkUppercase}
                onChange={(e) => updateTheme("wordmarkUppercase", e.target.checked)}
                className="accent-admin-accent"
              />
              <span style={{ textTransform: "uppercase", letterSpacing: "1px" }}>Caps</span>
            </label>
          </div>
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
      <div id="footer" className="scroll-mt-8" />
      <SettingGroup
        title="Footer"
        desc="A bar across the foot of every page, or a small info button in a corner. Its links are your menu (Navigation); its type size is in Typography."
      >
        <Field label="Text" htmlFor="footerText" inline>
          <div className="space-y-1">
            <Textarea
              id="footerText"
              rows={2}
              value={footerText}
              onChange={(e) => setFooterText(e.target.value)}
              placeholder="© 2026 Your Name"
            />
            <p className="text-[11px] text-admin-ink-soft">
              Links: [text](address). With a tagline set in Identity, this is the © line at the right of the bar.
            </p>
          </div>
        </Field>
        <Field label="Style" inline>
          <RadioGroup
            options={["bar", "floating"]}
            value={themeDraft.footerStyle}
            onChange={(v) => updateTheme("footerStyle", v as ThemeSettings["footerStyle"])}
          />
        </Field>
        {themeDraft.footerStyle === "floating" && (
          <Field label="Corner" inline>
            <RadioGroup
              options={["left", "center", "right"]}
              value={footerAlignment}
              onChange={(v) => setFooterAlignment(v)}
            />
          </Field>
        )}
      </SettingGroup>

      </>
      )}

      {/* Colors */}
      {tab === "colors" && (
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
          label="Secondary text"
          value={themeDraft.colorTextSoft}
          onChange={(v) => updateTheme("colorTextSoft", v)}
        />
        <ColorField
          label="Muted (captions, meta)"
          value={themeDraft.colorMuted}
          onChange={(v) => updateTheme("colorMuted", v)}
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
          label="Hairlines / rules"
          value={themeDraft.colorRule}
          onChange={(v) => updateTheme("colorRule", v)}
        />
        <ColorField
          label="Surface / mats"
          value={themeDraft.colorSurface}
          onChange={(v) => updateTheme("colorSurface", v)}
          allowTransparent
        />
        <ColorField
          label="Lightbox background"
          value={themeDraft.colorLightboxBg}
          onChange={(v) => updateTheme("colorLightboxBg", v)}
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
      )}

      {/* Lightbox */}
      {tab === "lightbox" && (
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
      )}

      <div className="flex justify-end">
        <Button kind="primary" onClick={handleSave} disabled={saving}>
          {saving ? "Saving..." : activeThemeId ? "Save changes" : "Create preset"}
        </Button>
      </div>

      <div className="mt-4 text-[12px] text-admin-ink-soft">
        <SectionLabel className="inline">Typography</SectionLabel> — fonts live
        in the{" "}
        <a href="/admin/settings/typography" className="text-admin-accent hover:underline">
          Typography
        </a>{" "}
        section and save to the same preset.
      </div>
    </>
  );

  const pagePreview = (
    <PreviewCard key="pages" label="Public pages">
      <ThemePreview theme={themeDraft} siteTitle={siteTitle} logoUrl={logoUrl} />
    </PreviewCard>
  );
  const lightboxPreview = (
    <PreviewCard key="lightbox" label="Lightbox" enlargeable={false}>
      <LightboxPreview
        theme={themeDraft}
        settings={{
          metadataFields: lightbox.metadataFields,
          cornerRadius: lightbox.cornerRadius,
          captionPosition: lightbox.captionPosition as LightboxSettings["captionPosition"],
          fadeSpeed: lightbox.fadeSpeed as LightboxSettings["fadeSpeed"],
          captionAlignment: lightbox.captionAlignment as LightboxSettings["captionAlignment"],
        }}
      />
    </PreviewCard>
  );

  return (
    <SettingsWithPreview
      settings={settings}
      // On the Lightbox tab, its preview comes first.
      preview={tab === "lightbox" ? [lightboxPreview, pagePreview] : [pagePreview, lightboxPreview]}
    />
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
  // These *are* the theme colours, so no theme swatches here.
  return (
    <Field label={label} inline>
      <div className="max-w-xs">
        <ColorControl
          value={value}
          onChange={onChange}
          tokens={false}
          allowTransparent={allowTransparent}
        />
      </div>
    </Field>
  );
}
