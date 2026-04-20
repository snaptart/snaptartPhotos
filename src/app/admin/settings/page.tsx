"use client";

import { useEffect, useState } from "react";
import ImagePicker from "@/components/admin/ImagePicker";
import { useMessage } from "@/lib/hooks/useMessage";
import { Button, Field, Input, Textarea } from "@/components/admin/ui";
import { SettingGroup } from "@/components/admin/settings/SettingGroup";
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
};

export default function IdentitySettingsPage() {
  const [loaded, setLoaded] = useState(false);
  const [draft, setDraft] = useState<IdentityDraft>(DEFAULT_DRAFT);
  const [saving, setSaving] = useState(false);
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
        ownerName: draft.ownerName || null,
        logoUrl: draft.logoUrl || null,
        bio: draft.bio || null,
        contactEmail: draft.contactEmail || null,
        instagramUrl: draft.instagramUrl || null,
        location: draft.location || null,
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
          <Field label="Tagline" htmlFor="tagline" inline hint="(optional)">
            <Input
              id="tagline"
              value={draft.tagline}
              onChange={(e) => update("tagline", e.target.value)}
              placeholder="A short line about your work"
            />
          </Field>
          <Field label="Owner name" htmlFor="ownerName" inline>
            <Input
              id="ownerName"
              value={draft.ownerName}
              onChange={(e) => update("ownerName", e.target.value)}
              placeholder="Your name"
            />
          </Field>
          <Field label="Logo / avatar" inline>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 shrink-0 overflow-hidden rounded-md bg-admin-ink text-admin-surface flex items-center justify-center font-serif italic text-2xl">
                {draft.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={draft.logoUrl}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  avatarLetter
                )}
              </div>
              <div className="flex-1">
                <ImagePicker
                  value={draft.logoUrl}
                  onChange={(v) => update("logoUrl", v)}
                />
              </div>
            </div>
          </Field>
          <Field label="Bio" htmlFor="bio" inline hint="(shown on About page)">
            <Textarea
              id="bio"
              rows={3}
              value={draft.bio}
              onChange={(e) => update("bio", e.target.value)}
              placeholder="A few sentences about who you are."
            />
          </Field>
        </SettingGroup>

        <SettingGroup
          title="Contact"
          desc="Optional. Shows on the About page and in site footer."
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
          <Field
            label="Location"
            htmlFor="location"
            inline
            hint="(vague is fine)"
          >
            <Input
              id="location"
              value={draft.location}
              onChange={(e) => update("location", e.target.value)}
              placeholder="Pacific Northwest, USA"
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
