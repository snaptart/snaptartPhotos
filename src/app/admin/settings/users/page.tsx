"use client";

import { useCallback, useEffect, useState } from "react";
import { KeyRound, Plus, Trash2 } from "lucide-react";
import { Button, Card, Drawer, Field, Input, Pill, RowMenu } from "@/components/admin/ui";
import { SettingGroup } from "@/components/admin/settings/SettingGroup";
import { useMessage } from "@/lib/hooks/useMessage";

type AdminUser = {
  id: string;
  email: string;
  createdAt: string;
  isCurrent: boolean;
};

// The drawer either adds an account or sets a new password on one.
type DrawerState = { mode: "add" } | { mode: "password"; user: AdminUser } | null;

const MIN_PASSWORD = 8;

export default function UsersSettingsPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [drawer, setDrawer] = useState<DrawerState>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const { message, showSuccess, showError, alertClass } = useMessage();

  const fetchUsers = useCallback(async () => {
    const res = await fetch("/api/admin-users");
    if (res.ok) setUsers(await res.json());
    else showError("Couldn't load users.");
    setLoading(false);
  }, [showError]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  function openDrawer(next: DrawerState) {
    setFormError("");
    setDrawer(next);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!drawer) return;
    const form = new FormData(e.currentTarget);
    const password = String(form.get("password") ?? "");
    if (password !== String(form.get("confirm") ?? "")) {
      setFormError("The two passwords don't match.");
      return;
    }

    setSaving(true);
    setFormError("");
    const res =
      drawer.mode === "add"
        ? await fetch("/api/admin-users", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: form.get("email"), password }),
          })
        : await fetch(`/api/admin-users/${drawer.user.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ password }),
          });
    setSaving(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setFormError(data.error || "Something went wrong. Try again.");
      return;
    }
    showSuccess(
      drawer.mode === "add"
        ? `Added ${form.get("email")}.`
        : `Password changed for ${drawer.user.email}.`,
    );
    setDrawer(null);
    if (drawer.mode === "add") fetchUsers();
  }

  async function handleDelete(user: AdminUser) {
    if (!confirm(`Delete ${user.email}? They will no longer be able to sign in.`)) return;
    const res = await fetch(`/api/admin-users/${user.id}`, { method: "DELETE" });
    if (res.ok) {
      showSuccess(`Deleted ${user.email}.`);
      fetchUsers();
    } else {
      const data = await res.json().catch(() => ({}));
      showError(data.error || "Couldn't delete that user.");
    }
  }

  return (
    <div className="max-w-[640px]">
      <SettingGroup
        title="Admin users"
        desc="Everyone listed here can sign in to this admin and change anything on the site."
      >
        {message && <div className={alertClass}>{message.text}</div>}

        {loading ? (
          <div className="text-admin-ink-soft">Loading...</div>
        ) : (
          <Card padded={false}>
            {users.map((user) => (
              <div
                key={user.id}
                className="flex items-center justify-between gap-4 border-b border-admin-border px-4 py-3 last:border-0"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="truncate font-medium text-admin-ink">{user.email}</span>
                    {user.isCurrent && <Pill tone="accent">You</Pill>}
                  </div>
                  <div className="text-[12px] text-admin-ink-soft">
                    Added {new Date(user.createdAt).toLocaleDateString()}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  <Button
                    kind="ghost"
                    size="sm"
                    onClick={() => openDrawer({ mode: "password", user })}
                  >
                    Change password
                  </Button>
                  {!user.isCurrent && (
                    <RowMenu
                      items={[
                        {
                          label: "Delete…",
                          icon: <Trash2 className="h-3.5 w-3.5" />,
                          danger: true,
                          onSelect: () => handleDelete(user),
                        },
                      ]}
                    />
                  )}
                </div>
              </div>
            ))}
          </Card>
        )}

        <div>
          <Button
            kind="primary"
            icon={<Plus className="h-3.5 w-3.5" />}
            onClick={() => openDrawer({ mode: "add" })}
          >
            Add user
          </Button>
        </div>
      </SettingGroup>

      <Drawer
        open={drawer !== null}
        onClose={() => setDrawer(null)}
        eyebrow={drawer?.mode === "password" ? "Change password" : "New admin user"}
        title={drawer?.mode === "password" ? drawer.user.email : "Add user"}
        width={440}
        footer={
          <>
            <Button type="submit" form="admin-user-form" kind="primary" disabled={saving}>
              {saving ? "Saving..." : drawer?.mode === "password" ? "Change password" : "Add user"}
            </Button>
            <Button type="button" kind="ghost" onClick={() => setDrawer(null)}>
              Cancel
            </Button>
          </>
        }
      >
        {drawer && (
          <form
            id="admin-user-form"
            key={drawer.mode === "password" ? drawer.user.id : "add"}
            onSubmit={handleSubmit}
            className="space-y-4"
          >
            {formError && <div className="alert-error">{formError}</div>}
            {drawer.mode === "add" && (
              <Field label="Email" htmlFor="u-email" hint="What they type to sign in.">
                <Input id="u-email" name="email" type="email" autoComplete="off" required />
              </Field>
            )}
            <Field
              label={drawer.mode === "add" ? "Password" : "New password"}
              htmlFor="u-password"
              hint={
                <span className="inline-flex items-center gap-1">
                  <KeyRound className="h-3 w-3" /> At least {MIN_PASSWORD} characters.
                </span>
              }
            >
              <Input
                id="u-password"
                name="password"
                type="password"
                autoComplete="new-password"
                minLength={MIN_PASSWORD}
                required
              />
            </Field>
            <Field label="Confirm password" htmlFor="u-confirm">
              <Input
                id="u-confirm"
                name="confirm"
                type="password"
                autoComplete="new-password"
                minLength={MIN_PASSWORD}
                required
              />
            </Field>
          </form>
        )}
      </Drawer>
    </div>
  );
}
