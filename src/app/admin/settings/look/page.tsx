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
      {/* Header */}
      <SettingGroup title="Header" desc="How the header is laid out and how it behaves as the page scrolls.">
        <Field label="Layout" inline>
          <RadioGroup
            options={[
              { value: "inline", label: "One row" },
              { value: "stacked", label: "Logo above menu" },
              { value: "split", label: "Menu either side" },
            ]}
            value={themeDraft.headerLayout}
            onChange={(v) => updateTheme("headerLayout", v as ThemeSettings["headerLayout"])}
          />
        </Field>
        <RangeField
          label="Height"
          value={themeDraft.headerPadding}
          min={4}
          max={64}
          unit="px"
          hint="Space above and below the logo and menu."
          onChange={(v) => updateTheme("headerPadding", v)}
        />
        <Field label="Width" inline>
          <RadioGroup
            options={[
              { value: "page", label: "Page column" },
              { value: "full", label: "Full window" },
            ]}
            value={themeDraft.headerWidth}
            onChange={(v) => updateTheme("headerWidth", v as ThemeSettings["headerWidth"])}
          />
        </Field>
        <Field label="Line underneath" inline>
          <div className="space-y-2">
            <Check checked={themeDraft.headerRule} onChange={(v) => updateTheme("headerRule", v)} label="Show" />
            {themeDraft.headerRule && (
              <div className="max-w-xs">
                <ColorControl
                  value={themeDraft.colorHeaderRule}
                  onChange={(v) => updateTheme("colorHeaderRule", v)}
                  tokens={false}
                  emptyLabel="Hairline colour"
                />
              </div>
            )}
          </div>
        </Field>
        <Field label="Scrolling" inline hint="Pinned keeps the header at the top of the window while the page scrolls.">
          <div className="space-y-2">
            <RadioGroup
              options={[
                { value: "scroll", label: "Scrolls away" },
                { value: "pinned", label: "Pinned" },
              ]}
              value={themeDraft.headerBehavior}
              onChange={(v) => updateTheme("headerBehavior", v as ThemeSettings["headerBehavior"])}
            />
            {themeDraft.headerBehavior === "pinned" && (
              <Check
                checked={themeDraft.headerShrink}
                onChange={(v) => updateTheme("headerShrink", v)}
                label="Shrink once the page scrolls"
              />
            )}
          </div>
        </Field>
        <Field
          label="Over a photo"
          inline
          hint="On pages that open with a full-width photo (a Hero Slideshow, or a Hero Banner on a full-bleed page) and don't show their title, the header lies over the photo, transparent. Pinned, it turns solid as the page scrolls."
        >
          <div className="space-y-2">
            <Check
              checked={themeDraft.headerOverPhoto}
              onChange={(v) => updateTheme("headerOverPhoto", v)}
              label="Lay the header over the photo"
            />
            {themeDraft.headerOverPhoto && (
              <>
                <div className="max-w-xs">
                  <ColorControl
                    value={themeDraft.colorHeaderOverPhoto}
                    onChange={(v) => updateTheme("colorHeaderOverPhoto", v)}
                    tokens={false}
                    emptyLabel="Hero overlay text colour"
                  />
                </div>
                {logoUrl && (
                  <RadioGroup
                    options={[
                      { value: "original", label: "Logo as uploaded" },
                      { value: "white", label: "Logo in white" },
                    ]}
                    value={themeDraft.headerOverPhotoLogo}
                    onChange={(v) => updateTheme("headerOverPhotoLogo", v as ThemeSettings["headerOverPhotoLogo"])}
                  />
                )}
              </>
            )}
          </div>
        </Field>
      </SettingGroup>

      {/* Logo */}
      <SettingGroup
        title="Logo"
        desc="Where your logo sits in the header. Upload the logo itself in Identity."
      >
        {themeDraft.headerLayout !== "split" && (
          <Field label={themeDraft.headerLayout === "stacked" ? "Alignment" : "Position"} inline>
            <RadioGroup
              options={["left", "center", "right"]}
              value={themeDraft.logoPosition}
              onChange={(v) =>
                updateTheme("logoPosition", v as ThemeSettings["logoPosition"])
              }
            />
          </Field>
        )}
        <RangeField
          label="Size"
          value={themeDraft.logoSize}
          min={20}
          max={400}
          step={2}
          unit="px"
          onChange={(v) => updateTheme("logoSize", v)}
        />
        <Field
          label="Size on phones"
          inline
          hint="Automatic is a third of the size for a logo image, and a little smaller for a wordmark."
        >
          <div className="space-y-2">
            <Check
              checked={themeDraft.mobileLogoScale == null}
              onChange={(v) => updateTheme("mobileLogoScale", v ? null : 50)}
              label="Automatic"
            />
            {themeDraft.mobileLogoScale != null && (
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min={10}
                  max={100}
                  step={5}
                  value={themeDraft.mobileLogoScale}
                  onChange={(e) => updateTheme("mobileLogoScale", Number(e.target.value))}
                  className="w-full accent-admin-accent"
                />
                <span className="w-12 shrink-0 text-right text-[12px] text-admin-ink-soft">
                  {themeDraft.mobileLogoScale}%
                </span>
              </div>
            )}
          </div>
        </Field>
        <Field
          label="Nudge"
          inline
          hint="Moves the logo a few pixels without moving anything else: for a logo file with uneven space around it. Right and down are positive."
        >
          <div className="space-y-1.5">
            <OffsetInputs
              label="Wider screens"
              x={themeDraft.logoOffsetX}
              y={themeDraft.logoOffsetY}
              onChange={(x, y) => setThemeDraft((d) => ({ ...d, logoOffsetX: x, logoOffsetY: y }))}
            />
            <OffsetInputs
              label="Phones"
              x={themeDraft.mobileLogoOffsetX}
              y={themeDraft.mobileLogoOffsetY}
              onChange={(x, y) => setThemeDraft((d) => ({ ...d, mobileLogoOffsetX: x, mobileLogoOffsetY: y }))}
            />
          </div>
        </Field>
        {themeDraft.headerLayout !== "stacked" && (
          <Field
            label="Hang below the header"
            inline
            hint="The header keeps the menu's height and the logo hangs down over the top of the page, like a badge. Nudge it up or down to set how far."
          >
            <Check
              checked={themeDraft.logoOverhang}
              onChange={(v) => updateTheme("logoOverhang", v)}
              label="Let the logo hang below"
            />
          </Field>
        )}
        {themeDraft.headerLayout !== "stacked" && !themeDraft.logoOverhang && (
          <Field label="Line up with menu" inline hint="Which edge of the logo the menu lines up with.">
            <RadioGroup
              options={[
                { value: "top", label: "Top" },
                { value: "center", label: "Middle" },
                { value: "bottom", label: "Bottom" },
              ]}
              value={themeDraft.logoAlign}
              onChange={(v) => updateTheme("logoAlign", v as ThemeSettings["logoAlign"])}
            />
          </Field>
        )}
        {(themeDraft.headerLayout === "stacked" ||
          (themeDraft.headerLayout === "inline" && themeDraft.logoPosition === themeDraft.menuJustify)) && (
          <RangeField
            label="Space to the menu"
            value={themeDraft.logoGap}
            min={0}
            max={80}
            unit="px"
            onChange={(v) => updateTheme("logoGap", v)}
          />
        )}
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

      {/* Menu */}
      <SettingGroup title="Menu" desc="How the navigation menu looks in the header. Its font and size are set in Typography.">
        {themeDraft.headerLayout === "inline" && (
          <Field label="Position" inline>
            <RadioGroup
              options={["left", "center", "right"]}
              value={themeDraft.menuJustify}
              onChange={(v) =>
                updateTheme("menuJustify", v as ThemeSettings["menuJustify"])
              }
            />
          </Field>
        )}
        <RangeField
          label="Space between items"
          value={themeDraft.menuGap}
          min={8}
          max={80}
          unit="px"
          onChange={(v) => updateTheme("menuGap", v)}
        />
        <ColorField
          label="Text colour"
          value={themeDraft.colorMenuText}
          onChange={(v) => updateTheme("colorMenuText", v)}
          emptyLabel="Text colour"
        />
        <Field label="On hover" inline>
          <RadioGroup
            options={LINK_HOVER_OPTIONS}
            value={themeDraft.menuHover}
            onChange={(v) => updateTheme("menuHover", v as ThemeSettings["menuHover"])}
          />
        </Field>
        <Field label="Current page" inline>
          <RadioGroup
            options={[
              { value: "underline", label: "Underline" },
              { value: "color", label: "Colour" },
              { value: "bold", label: "Bold" },
              { value: "none", label: "Not marked" },
            ]}
            value={themeDraft.menuCurrent}
            onChange={(v) => updateTheme("menuCurrent", v as ThemeSettings["menuCurrent"])}
          />
        </Field>
        {(themeDraft.menuHover === "color" || themeDraft.menuCurrent === "color") && (
          <ColorField
            label="Highlight colour"
            value={themeDraft.colorMenuHighlight}
            onChange={(v) => updateTheme("colorMenuHighlight", v)}
            emptyLabel="Accent colour"
          />
        )}
      </SettingGroup>

      {/* Phones */}
      <SettingGroup title="Phones" desc="The header on small screens: the logo in the middle and a menu button beside it.">
        <Field label="Menu button" inline>
          <RadioGroup
            options={["left", "right"]}
            value={themeDraft.mobileMenuSide}
            onChange={(v) => updateTheme("mobileMenuSide", v as ThemeSettings["mobileMenuSide"])}
          />
        </Field>
        <Field label="Menu opens as" inline>
          <RadioGroup
            options={[
              { value: "dropdown", label: "Panel under the header" },
              { value: "overlay", label: "Full screen" },
              { value: "drawer", label: "Drawer from the side" },
            ]}
            value={themeDraft.mobileMenuStyle}
            onChange={(v) => updateTheme("mobileMenuStyle", v as ThemeSettings["mobileMenuStyle"])}
          />
        </Field>
      </SettingGroup>

      {/* Footer */}
      <div id="footer" className="scroll-mt-8" />
      <SettingGroup
        title="Footer"
        desc="Across the foot of every page, or a small info button in a corner. Its links are your menu (Navigation); its type size is in Typography."
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
              Links: [text](address). The © line. In the bar without a tagline (set in Identity), it sits under the site name.
            </p>
          </div>
        </Field>
        <Field label="Layout" inline>
          <RadioGroup
            options={[
              { value: "bar", label: "Bar" },
              { value: "centered", label: "Centred" },
              { value: "columns", label: "Columns" },
              { value: "minimal", label: "© line only" },
              { value: "floating", label: "Info button" },
            ]}
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
        {themeDraft.footerStyle !== "floating" && (
          <>
            {themeDraft.footerStyle !== "minimal" && (
              <>
                <Field label="Heading" inline>
                  <div className="space-y-2">
                    <RadioGroup
                      options={[
                        { value: "name", label: "Site name" },
                        { value: "logo", label: "Logo image" },
                        { value: "none", label: "None" },
                      ]}
                      value={themeDraft.footerBrand}
                      onChange={(v) => updateTheme("footerBrand", v as ThemeSettings["footerBrand"])}
                    />
                    {themeDraft.footerBrand === "logo" && !logoUrl && (
                      <p className="text-[12px] text-admin-ink-soft">No logo uploaded yet, so the site name shows.</p>
                    )}
                  </div>
                </Field>
                {themeDraft.footerBrand === "logo" && logoUrl ? (
                  <RangeField
                    label="Logo height"
                    value={themeDraft.footerLogoHeight}
                    min={12}
                    max={160}
                    unit="px"
                    onChange={(v) => updateTheme("footerLogoHeight", v)}
                  />
                ) : themeDraft.footerBrand !== "none" ? (
                  <RangeField
                    label="Name size"
                    value={themeDraft.footerNameSize}
                    min={10}
                    max={48}
                    unit="px"
                    onChange={(v) => updateTheme("footerNameSize", v)}
                  />
                ) : null}
                <Field label="Show" inline>
                  <div className="flex flex-col gap-1.5">
                    <Check checked={themeDraft.footerShowTagline} onChange={(v) => updateTheme("footerShowTagline", v)} label="Tagline" />
                    <Check checked={themeDraft.footerShowMenu} onChange={(v) => updateTheme("footerShowMenu", v)} label="Menu links" />
                    <Check checked={themeDraft.footerShowEmail} onChange={(v) => updateTheme("footerShowEmail", v)} label="Email link" />
                    <Check checked={themeDraft.footerShowSocial} onChange={(v) => updateTheme("footerShowSocial", v)} label="Instagram link" />
                    <Check checked={themeDraft.footerShowText} onChange={(v) => updateTheme("footerShowText", v)} label="Footer text (© line)" />
                  </div>
                </Field>
              </>
            )}
            <RangeField
              label="Height"
              value={themeDraft.footerPadding}
              min={12}
              max={120}
              unit="px"
              hint="Space above and below the footer. Phones get two thirds of it."
              onChange={(v) => updateTheme("footerPadding", v)}
            />
            <Field label="Width" inline>
              <RadioGroup
                options={[
                  { value: "page", label: "Page column" },
                  { value: "full", label: "Full window" },
                ]}
                value={themeDraft.footerWidth}
                onChange={(v) => updateTheme("footerWidth", v as ThemeSettings["footerWidth"])}
              />
            </Field>
            <Field label="Line on top" inline>
              <div className="space-y-2">
                <Check checked={themeDraft.footerRule} onChange={(v) => updateTheme("footerRule", v)} label="Show" />
                {themeDraft.footerRule && (
                  <div className="max-w-xs">
                    <ColorControl
                      value={themeDraft.colorFooterRule}
                      onChange={(v) => updateTheme("colorFooterRule", v)}
                      tokens={false}
                      emptyLabel="Hairline colour"
                    />
                  </div>
                )}
              </div>
            </Field>
            {themeDraft.footerStyle !== "minimal" && (
              <>
                <ColorField
                  label="Link colour"
                  value={themeDraft.colorFooterLink}
                  onChange={(v) => updateTheme("colorFooterLink", v)}
                  emptyLabel="Footer text colour"
                />
                <Field label="Links on hover" inline>
                  <RadioGroup
                    options={LINK_HOVER_OPTIONS}
                    value={themeDraft.footerLinkHover}
                    onChange={(v) => updateTheme("footerLinkHover", v as ThemeSettings["footerLinkHover"])}
                  />
                </Field>
                {themeDraft.footerLinkHover === "color" && (
                  <ColorField
                    label="Hover colour"
                    value={themeDraft.colorFooterHighlight}
                    onChange={(v) => updateTheme("colorFooterHighlight", v)}
                    emptyLabel="Accent colour"
                  />
                )}
              </>
            )}
          </>
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
      <ThemePreview theme={themeDraft} siteTitle={siteTitle} logoUrl={logoUrl} footerText={footerText} />
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

type Option = string | { value: string; label: string };

function RadioGroup({
  options,
  value,
  onChange,
}: {
  options: Option[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1.5">
      {options.map((o) => {
        const opt = typeof o === "string" ? { value: o, label: o } : o;
        return (
          <label
            key={opt.value}
            className={`flex items-center gap-1.5 text-[13px] text-admin-ink cursor-pointer ${typeof o === "string" ? "capitalize" : ""}`}
          >
            <input
              type="radio"
              checked={value === opt.value}
              onChange={() => onChange(opt.value)}
              className="accent-admin-accent"
            />
            {opt.label}
          </label>
        );
      })}
    </div>
  );
}

const LINK_HOVER_OPTIONS = [
  { value: "fade", label: "Fade" },
  { value: "underline", label: "Underline" },
  { value: "color", label: "Colour" },
  { value: "none", label: "No change" },
];

function Check({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="flex items-center gap-2 text-[13px] text-admin-ink cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="accent-admin-accent"
      />
      {label}
    </label>
  );
}

function OffsetInputs({
  label,
  x,
  y,
  onChange,
}: {
  label: string;
  x: number;
  y: number;
  onChange: (x: number, y: number) => void;
}) {
  const num = (v: string) => Math.max(-200, Math.min(200, Math.round(Number(v) || 0)));
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-admin-ink-soft">
      <span className="w-24">{label}</span>
      <label className="flex items-center gap-1.5">
        X
        <Input type="number" step={1} value={x} onChange={(e) => onChange(num(e.target.value), y)} className="w-20" />
      </label>
      <label className="flex items-center gap-1.5">
        Y
        <Input type="number" step={1} value={y} onChange={(e) => onChange(x, num(e.target.value))} className="w-20" />
      </label>
      px
      {(x !== 0 || y !== 0) && (
        <button type="button" onClick={() => onChange(0, 0)} className="text-admin-accent hover:underline">
          Reset
        </button>
      )}
    </div>
  );
}

function RangeField({
  label,
  value,
  min,
  max,
  step = 1,
  unit,
  hint,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit: string;
  hint?: string;
  onChange: (v: number) => void;
}) {
  return (
    <Field label={`${label} — ${value}${unit}`} inline hint={hint}>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-admin-accent"
      />
    </Field>
  );
}

function ColorField({
  label,
  value,
  onChange,
  allowTransparent,
  emptyLabel,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  allowTransparent?: boolean;
  /** Offer "follow another colour" under this name; stores "". */
  emptyLabel?: string;
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
          emptyLabel={emptyLabel}
        />
      </div>
    </Field>
  );
}
