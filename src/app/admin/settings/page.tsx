"use client";

import { useEffect, useState } from "react";
import ImagePicker from "@/components/admin/ImagePicker";

interface SiteSettings {
  id: string;
  siteTitle: string;
  logoUrl: string | null;
  instagramUrl: string | null;
  footerText: string | null;
  contactEmail: string | null;
  lightboxMetadataFields: string[] | null;
  lightboxCornerRadius: number | null;
  lightboxCaptionPosition: string | null;
  lightboxFadeSpeed: string | null;
  lightboxCaptionAlignment: string | null;
}

interface SettingsDraft {
  logoUrl: string;
  lbMetadataFields: string[];
  lbCornerRadius: number;
  lbCaptionPosition: string;
  lbFadeSpeed: string;
  lbCaptionAlignment: string;
}

const LIGHTBOX_METADATA_OPTIONS = [
  { key: "title", label: "Title" },
  { key: "description", label: "Description" },
  { key: "location", label: "Location" },
  { key: "camera", label: "Camera Settings" },
  { key: "filename", label: "Filename" },
];

function draftFromSettings(data: SiteSettings): SettingsDraft {
  return {
    logoUrl: data.logoUrl ?? "",
    lbMetadataFields: data.lightboxMetadataFields ?? ["title", "location"],
    lbCornerRadius: data.lightboxCornerRadius ?? 0,
    lbCaptionPosition: data.lightboxCaptionPosition ?? "below",
    lbFadeSpeed: data.lightboxFadeSpeed ?? "medium",
    lbCaptionAlignment: data.lightboxCaptionAlignment ?? "left",
  };
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [draft, setDraft] = useState<SettingsDraft>({
    logoUrl: "",
    lbMetadataFields: ["title", "location"],
    lbCornerRadius: 0,
    lbCaptionPosition: "below",
    lbFadeSpeed: "medium",
    lbCaptionAlignment: "left",
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [pwSaving, setPwSaving] = useState(false);
  const [pwMessage, setPwMessage] = useState("");

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((data) => {
        setSettings(data);
        if (data) setDraft(draftFromSettings(data));
      });
  }, []);

  function updateDraft<K extends keyof SettingsDraft>(key: K, value: SettingsDraft[K]) {
    setDraft((d) => ({ ...d, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setMessage("");

    const form = new FormData(e.currentTarget);
    const data = {
      siteTitle: form.get("siteTitle"),
      logoUrl: draft.logoUrl || null,
      instagramUrl: form.get("instagramUrl") || null,
      footerText: form.get("footerText") || null,
      contactEmail: form.get("contactEmail") || null,
      lightboxMetadataFields: draft.lbMetadataFields,
      lightboxCornerRadius: draft.lbCornerRadius,
      lightboxCaptionPosition: draft.lbCaptionPosition,
      lightboxFadeSpeed: draft.lbFadeSpeed,
      lightboxCaptionAlignment: draft.lbCaptionAlignment,
    };

    const res = await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (res.ok) {
      const updated = await res.json();
      setSettings(updated);
      setDraft(draftFromSettings(updated));
      setMessage("Settings saved!");
    } else {
      setMessage("Failed to save settings");
    }
    setSaving(false);
  }

  async function handlePasswordChange(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formEl = e.currentTarget; // capture before any await — React nulls this after the event
    setPwSaving(true);
    setPwMessage("");

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
      setPwMessage("Password updated!");
      formEl.reset();
    } else {
      const data = await res.json();
      setPwMessage(data.error || "Failed to update password");
    }
    setPwSaving(false);
  }

  if (!settings) return <div className="text-neutral-500">Loading...</div>;

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold">Site Settings</h1>

      {message && (
        <div className={message.includes("Failed") ? "alert-error" : "alert-success"}>
          {message}
        </div>
      )}

      <form onSubmit={handleSubmit} className="max-w-lg space-y-4">
        <Field label="Site Title" name="siteTitle" defaultValue={settings.siteTitle} required />
        <div>
          <label className="mb-1 block text-sm font-medium text-neutral-700">Logo</label>
          <ImagePicker value={draft.logoUrl} onChange={(v) => updateDraft("logoUrl", v)} />
        </div>
        <Field label="Instagram URL" name="instagramUrl" defaultValue={settings.instagramUrl ?? ""} placeholder="https://instagram.com/..." />
        <Field label="Contact Email" name="contactEmail" type="email" defaultValue={settings.contactEmail ?? ""} />
        <div>
          <label className="mb-1 block text-sm font-medium text-neutral-700">Footer Text</label>
          <textarea
            name="footerText"
            defaultValue={settings.footerText ?? ""}
            rows={3}
            className="input-base"
          />
        </div>

        {/* Lightbox Defaults */}
        <div className="border-t border-neutral-200 pt-4">
          <h2 className="mb-3 text-base font-semibold text-neutral-800">Lightbox Defaults</h2>
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-neutral-700">Metadata to Show</label>
              <div className="flex flex-col gap-1">
                {LIGHTBOX_METADATA_OPTIONS.map((opt) => (
                  <label key={opt.key} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={draft.lbMetadataFields.includes(opt.key)}
                      onChange={(e) => {
                        const fields = e.target.checked
                          ? [...draft.lbMetadataFields, opt.key]
                          : draft.lbMetadataFields.filter((k) => k !== opt.key);
                        updateDraft("lbMetadataFields", fields);
                      }}
                    />
                    {opt.label}
                  </label>
                ))}
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-neutral-700">
                Corner Radius — {draft.lbCornerRadius}px
              </label>
              <input
                type="range"
                min={0}
                max={32}
                step={1}
                value={draft.lbCornerRadius}
                onChange={(e) => updateDraft("lbCornerRadius", Number(e.target.value))}
                className="w-full"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-neutral-700">Caption Position</label>
              <select
                value={draft.lbCaptionPosition}
                onChange={(e) => updateDraft("lbCaptionPosition", e.target.value)}
                className="input-base"
              >
                <option value="below">Below image</option>
                <option value="overlay-top">Overlay — top</option>
                <option value="overlay-bottom">Overlay — bottom</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-neutral-700">Fade Speed</label>
              <select
                value={draft.lbFadeSpeed}
                onChange={(e) => updateDraft("lbFadeSpeed", e.target.value)}
                className="input-base"
              >
                <option value="none">None (instant)</option>
                <option value="fast">Fast (150ms)</option>
                <option value="medium">Medium (300ms)</option>
                <option value="slow">Slow (500ms)</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-neutral-700">Caption Alignment</label>
              <select
                value={draft.lbCaptionAlignment}
                onChange={(e) => updateDraft("lbCaptionAlignment", e.target.value)}
                className="input-base"
              >
                <option value="left">Left</option>
                <option value="center">Center</option>
                <option value="right">Right</option>
              </select>
            </div>
          </div>
        </div>

        <button type="submit" disabled={saving} className="btn-primary">
          {saving ? "Saving..." : "Save Settings"}
        </button>
      </form>

      <hr className="my-8 border-neutral-200" />

      <h2 className="mb-4 text-xl font-semibold">Change Password</h2>

      {pwMessage && (
        <div className={pwMessage.includes("Password updated") ? "alert-success" : "alert-error"}>
          {pwMessage}
        </div>
      )}

      <form onSubmit={handlePasswordChange} className="max-w-lg space-y-4">
        <Field label="Current Password" name="currentPassword" type="password" defaultValue="" required />
        <Field label="New Password" name="newPassword" type="password" defaultValue="" required />
        <button type="submit" disabled={pwSaving} className="btn-primary">
          {pwSaving ? "Updating..." : "Update Password"}
        </button>
      </form>
    </div>
  );
}

function Field({
  label,
  name,
  defaultValue,
  type = "text",
  placeholder,
  required,
}: {
  label: string;
  name: string;
  defaultValue: string;
  type?: string;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-neutral-700">{label}</label>
      <input
        name={name}
        type={type}
        defaultValue={defaultValue}
        placeholder={placeholder}
        required={required}
        className="input-base"
      />
    </div>
  );
}
