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
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [pwSaving, setPwSaving] = useState(false);
  const [pwMessage, setPwMessage] = useState("");

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((data) => {
        setSettings(data);
        setLogoUrl(data?.logoUrl ?? "");
      });
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setMessage("");

    const form = new FormData(e.currentTarget);
    const data = {
      siteTitle: form.get("siteTitle"),
      logoUrl: logoUrl || null,
      instagramUrl: form.get("instagramUrl") || null,
      footerText: form.get("footerText") || null,
      contactEmail: form.get("contactEmail") || null,
    };

    const res = await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (res.ok) {
      const updated = await res.json();
      setSettings(updated);
      setLogoUrl(updated.logoUrl ?? "");
      setMessage("Settings saved!");
    } else {
      setMessage("Failed to save settings");
    }
    setSaving(false);
  }

  async function handlePasswordChange(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
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
      e.currentTarget.reset();
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
        <div className={`mb-4 rounded px-3 py-2 text-sm ${message.includes("Failed") ? "bg-red-50 text-red-600" : "bg-green-50 text-green-600"}`}>
          {message}
        </div>
      )}

      <form onSubmit={handleSubmit} className="max-w-lg space-y-4">
        <Field label="Site Title" name="siteTitle" defaultValue={settings.siteTitle} required />
        <div>
          <label className="mb-1 block text-sm font-medium text-neutral-700">Logo</label>
          <ImagePicker value={logoUrl} onChange={setLogoUrl} />
        </div>
        <Field label="Instagram URL" name="instagramUrl" defaultValue={settings.instagramUrl ?? ""} placeholder="https://instagram.com/..." />
        <Field label="Contact Email" name="contactEmail" type="email" defaultValue={settings.contactEmail ?? ""} />
        <div>
          <label className="mb-1 block text-sm font-medium text-neutral-700">Footer Text</label>
          <textarea
            name="footerText"
            defaultValue={settings.footerText ?? ""}
            rows={3}
            className="w-full rounded border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none"
          />
        </div>
        <button
          type="submit"
          disabled={saving}
          className="rounded bg-neutral-900 px-4 py-2 text-sm text-white hover:bg-neutral-700 disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save Settings"}
        </button>
      </form>

      <hr className="my-8 border-neutral-200" />

      <h2 className="mb-4 text-xl font-semibold">Change Password</h2>

      {pwMessage && (
        <div className={`mb-4 max-w-lg rounded px-3 py-2 text-sm ${pwMessage.includes("Password updated") ? "bg-green-50 text-green-600" : "bg-red-50 text-red-600"}`}>
          {pwMessage}
        </div>
      )}

      <form onSubmit={handlePasswordChange} className="max-w-lg space-y-4">
        <Field label="Current Password" name="currentPassword" type="password" defaultValue="" required />
        <Field label="New Password" name="newPassword" type="password" defaultValue="" required />
        <button
          type="submit"
          disabled={pwSaving}
          className="rounded bg-neutral-900 px-4 py-2 text-sm text-white hover:bg-neutral-700 disabled:opacity-50"
        >
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
        className="w-full rounded border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none"
      />
    </div>
  );
}
