"use client";

import { useEffect, useState } from "react";
import ImagePicker from "@/components/admin/ImagePicker";
import AssetUpload from "@/components/admin/AssetUpload";
import { useMessage } from "@/lib/hooks/useMessage";
import { Button, Field, Input, Textarea } from "@/components/admin/ui";
import { SettingGroup } from "@/components/admin/settings/SettingGroup";
import { SegmentedControl } from "@/components/admin/controls";
import siteConfig from "@/lib/site.config";

interface IdentityDraft {
  siteTitle: string;
  tagline: string;
  ownerName: string;
  logoUrl: string;
  bio: string;
  contactEmail: string;
  instagramUrl: string;
  location: string;
  faviconUrl: string;
  faviconDarkUrl: string;
  faviconShape: "square" | "round";
  shareImageUrl: string;
}

const DEFAULT_DRAFT: IdentityDraft = {
  siteTitle: "",
  tagline: "",
  ownerName: "",
  logoUrl: "",
  bio: "",
  contactEmail: "",
  instagramUrl: "",
  location: "",
  faviconUrl: "",
  faviconDarkUrl: "",
  faviconShape: "square",
  shareImageUrl: "",
};

export default function IdentitySettingsPage() {
  const [loaded, setLoaded] = useState(false);
  const [draft, setDraft] = useState<IdentityDraft>(DEFAULT_DRAFT);
  const [saving, setSaving] = useState(false);
  const [iconWarning, setIconWarning] = useState<string | null>(null);
  const { message, showSuccess, showError, clear, alertClass } = useMessage();

  const [pwSaving, setPwSaving] = useState(false);
  const {
    message: pwMessage,
    showSuccess: pwShowSuccess,
    showError: pwShowError,
    clear: pwClear,
    alertClass: pwAlertClass,
  } = useMessage();

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((data) => {
        if (data) {
          setDraft({
            siteTitle: data.siteTitle ?? "",
            tagline: data.tagline ?? "",
            ownerName: data.ownerName ?? "",
            logoUrl: data.logoUrl ?? "",
            bio: data.bio ?? "",
            contactEmail: data.contactEmail ?? "",
            instagramUrl: data.instagramUrl ?? "",
            location: data.location ?? "",
            faviconUrl: data.faviconUrl ?? "",
            faviconDarkUrl: data.faviconDarkUrl ?? "",
            faviconShape: data.faviconShape === "round" ? "round" : "square",
            shareImageUrl: data.shareImageUrl ?? "",
          });
        }
        setLoaded(true);
      });
  }, []);

  function update<K extends keyof IdentityDraft>(key: K, value: IdentityDraft[K]) {
    setDraft((d) => ({ ...d, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    clear();
    const res = await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        siteTitle: draft.siteTitle,
        tagline: draft.tagline || null,
        logoUrl: draft.logoUrl || null,
        contactEmail: draft.contactEmail || null,
        instagramUrl: draft.instagramUrl || null,
        faviconUrl: draft.faviconUrl || null,
        faviconDarkUrl: draft.faviconDarkUrl || null,
        faviconShape: draft.faviconShape,
        shareImageUrl: draft.shareImageUrl || null,
      }),
    });
    if (res.ok) showSuccess("Identity saved.");
    else showError("Failed to save.");
    setSaving(false);
  }

  async function handlePasswordChange(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formEl = e.currentTarget;
    setPwSaving(true);
    pwClear();
    const form = new FormData(e.currentTarget);
    const res = await fetch("/api/change-password", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        currentPassword: form.get("currentPassword"),
        newPassword: form.get("newPassword"),
      }),
    });
    if (res.ok) {
      pwShowSuccess("Password updated.");
      formEl.reset();
    } else {
      const data = await res.json();
      pwShowError(data.error || "Failed to update password.");
    }
    setPwSaving(false);
  }

  if (!loaded) return <div className="text-admin-ink-soft">Loading...</div>;

  const avatarLetter =
    (draft.siteTitle || siteConfig.siteName || "s").charAt(0).toLowerCase();

  return (
    <div className="max-w-[640px]">
      {message && <div className={`${alertClass} mb-4`}>{message.text}</div>}

      <form onSubmit={handleSubmit}>
        <SettingGroup title="Identity" desc="How your site introduces itself.">
          <Field label="Site name" htmlFor="siteTitle" inline>
            <Input
              id="siteTitle"
              value={draft.siteTitle}
              onChange={(e) => update("siteTitle", e.target.value)}
              required
            />
          </Field>
          <Field
            label="Tagline"
            htmlFor="tagline"
            inline
            hint="(optional) Shown under the site name in the footer bar."
          >
            <Input
              id="tagline"
              value={draft.tagline}
              onChange={(e) => update("tagline", e.target.value)}
              placeholder="A short line, e.g. what you do and where"
            />
          </Field>
          <Field label="Logo / avatar" inline>
            <div className="flex items-center gap-3">
              <div
                className={`w-12 h-12 shrink-0 overflow-hidden rounded-md flex items-center justify-center font-serif italic text-2xl ${
                  draft.logoUrl ? "border border-admin-border bg-white p-1" : "bg-admin-ink text-admin-surface"
                }`}
              >
                {draft.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={draft.logoUrl}
                    alt=""
                    className="h-full w-full object-contain"
                  />
                ) : (
                  avatarLetter
                )}
              </div>
              <div className="flex-1">
                <ImagePicker
                  value={draft.logoUrl}
                  onChange={(v) => update("logoUrl", v)}
                  fit="contain"
                />
              </div>
            </div>
          </Field>
        </SettingGroup>

        <SettingGroup
          title="Browser icon & sharing"
          desc="The icon in browser tabs and on phone home screens, and the picture shown when a link to the site is shared."
        >
          <Field
            label="Site icon"
            inline
            hint={
              iconWarning ??
              "A square PNG or SVG, 512 × 512 px or larger. Until you add one, the site uses its first letter."
            }
          >
            <AssetUpload
              value={draft.faviconUrl}
              onChange={(v) => {
                update("faviconUrl", v);
                if (!v) setIconWarning(null);
              }}
              accept="image/png,image/svg+xml,image/webp,image/jpeg"
              onDimensions={(w, h) =>
                setIconWarning(
                  w && h && w !== h
                    ? `This image is ${w} × ${h} px. It will be fitted into a square with see-through edges; a square image looks better.`
                    : w && w < 180
                      ? `This image is only ${w} px wide, so it will look soft on phone home screens. 512 px or larger works best.`
                      : null,
                )
              }
              preview={(url) => <IconPreview url={url} title={draft.siteTitle} round={draft.faviconShape === "round"} />}
            />
            {!draft.faviconUrl && (
              <div className="mt-2">
                <IconPreview letter={avatarLetter} title={draft.siteTitle} round={draft.faviconShape === "round"} />
              </div>
            )}
          </Field>
          <Field
            label="Dark-mode icon"
            inline
            hint="(optional) Used in browser tabs when the browser has a dark theme, e.g. a light version of a dark logo. Safari always shows the main icon."
          >
            <AssetUpload
              value={draft.faviconDarkUrl}
              onChange={(v) => update("faviconDarkUrl", v)}
              accept="image/png,image/svg+xml,image/webp,image/jpeg"
              preview={(url) => <IconPreview url={url} title={draft.siteTitle} round={draft.faviconShape === "round"} dark />}
            />
          </Field>
          <Field
            label="Icon shape"
            inline
            hint={
              draft.faviconShape === "round"
                ? "The icon fills a circle; its edges are cropped. Suits a photo."
                : "The whole image, fitted into a square. Suits a logo."
            }
          >
            <SegmentedControl
              options={[
                { label: "Square", value: "square" },
                { label: "Round", value: "round" },
              ]}
              value={draft.faviconShape}
              onChange={(v) => update("faviconShape", v as IdentityDraft["faviconShape"])}
            />
          </Field>
          <Field
            label="Share image"
            inline
            hint="(optional) Shown in link previews (messages, social posts) for pages without their own image. Landscape, about 1200 × 630 px, works best."
          >
            <ImagePicker value={draft.shareImageUrl} onChange={(v) => update("shareImageUrl", v)} />
          </Field>
        </SettingGroup>

        <SettingGroup
          title="Contact"
          desc="Optional. Each one set here is added to the links in the footer bar."
        >
          <Field label="Email" htmlFor="contactEmail" inline>
            <Input
              id="contactEmail"
              type="email"
              value={draft.contactEmail}
              onChange={(e) => update("contactEmail", e.target.value)}
              placeholder="hello@example.com"
            />
          </Field>
          <Field label="Instagram" htmlFor="instagramUrl" inline>
            <Input
              id="instagramUrl"
              value={draft.instagramUrl}
              onChange={(e) => update("instagramUrl", e.target.value)}
              placeholder="https://instagram.com/..."
            />
          </Field>
        </SettingGroup>

        <div className="flex justify-end mb-12">
          <Button type="submit" kind="primary" disabled={saving}>
            {saving ? "Saving..." : "Save changes"}
          </Button>
        </div>
      </form>

      <form onSubmit={handlePasswordChange}>
        <SettingGroup
          title="Security"
          desc="Change the admin credentials for this site."
        >
          {pwMessage && (
            <div className={`${pwAlertClass} mb-2`}>{pwMessage.text}</div>
          )}
          <Field label="Current password" htmlFor="currentPassword" inline>
            <Input
              id="currentPassword"
              name="currentPassword"
              type="password"
              required
            />
          </Field>
          <Field label="New password" htmlFor="newPassword" inline>
            <Input id="newPassword" name="newPassword" type="password" required />
          </Field>
        </SettingGroup>
        <div className="flex justify-end">
          <Button type="submit" kind="primary" disabled={pwSaving}>
            {pwSaving ? "Updating..." : "Update password"}
          </Button>
        </div>
      </form>
    </div>
  );
}

/** The icon as it looks in a browser tab and as a phone home-screen tile. */
function IconPreview({
  url,
  letter,
  title,
  dark = false,
  round = false,
}: {
  url?: string;
  letter?: string;
  title: string;
  dark?: boolean;
  round?: boolean;
}) {
  const mark = (px: number) =>
    url ? (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={url} alt="" style={{ width: px, height: px }} className={`shrink-0 ${round ? "rounded-full object-cover" : "object-contain"}`} />
    ) : (
      <span
        style={{ width: px, height: px, fontSize: px * 0.7 }}
        className={`shrink-0 flex items-center justify-center bg-[#171717] text-white leading-none ${round ? "rounded-full" : ""}`}
      >
        {letter}
      </span>
    );
  return (
    <div className="flex items-end gap-3 shrink-0">
      <div
        className={`flex items-center gap-2 rounded-t-lg px-3 py-1.5 text-[12px] w-[150px] ${
          dark
            ? "bg-[#35363a] text-neutral-100"
            : "bg-admin-surface-2 text-admin-ink border border-b-0 border-admin-border"
        }`}
      >
        {mark(16)}
        <span className="truncate">{title || "Site name"}</span>
      </div>
      {!dark && (
        <div className="rounded-[10px] overflow-hidden bg-white shadow-sm border border-admin-border">
          {mark(44)}
        </div>
      )}
    </div>
  );
}
