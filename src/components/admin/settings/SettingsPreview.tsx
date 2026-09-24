"use client";

import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Maximize2, X } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Settings on the left, their preview pinned on the right from 1024px up, so a
 * change and its effect are on screen together. Narrower, the preview follows
 * the settings.
 */
export function SettingsWithPreview({ settings, preview }: { settings: ReactNode; preview: ReactNode }) {
  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(300px,42%)] lg:gap-10">
      <div className="min-w-0">{settings}</div>
      <aside className="min-w-0 space-y-5 lg:sticky lg:top-6 lg:max-h-[calc(100vh-3rem)] lg:self-start lg:overflow-y-auto lg:pb-2">
        {preview}
      </aside>
    </div>
  );
}

/** One preview in the column, with a button to see it large. */
export function PreviewCard({ label, children, enlargeable = true }: { label: string; children: ReactNode; enlargeable?: boolean }) {
  const [big, setBig] = useState(false);

  useEffect(() => {
    if (!big) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setBig(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [big]);

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <div className="font-mono text-[10px] uppercase tracking-[2px] text-admin-ink-soft">{label}</div>
        {enlargeable && (
          <button
            type="button"
            onClick={() => setBig(true)}
            className="inline-flex items-center gap-1 text-[11px] text-admin-ink-soft hover:text-admin-ink"
          >
            <Maximize2 className="h-3 w-3" />
            Enlarge
          </button>
        )}
      </div>
      {children}
      {big &&
        createPortal(
          <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-admin-ink/40 p-6 font-sans" onClick={() => setBig(false)}>
            <div
              role="dialog"
              aria-modal="true"
              aria-label={`${label} preview`}
              className="w-full max-w-[1200px] rounded-lg border border-admin-border bg-admin-surface p-4 shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-3 flex items-center justify-between">
                <div className="font-mono text-[10px] uppercase tracking-[2px] text-admin-ink-soft">{label}</div>
                <button type="button" onClick={() => setBig(false)} aria-label="Close" className="p-1 text-admin-ink-soft hover:text-admin-ink">
                  <X className="h-4 w-4" />
                </button>
              </div>
              {children}
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}

/** The tab a settings page was last on, remembered per browser. */
export function useSettingsTab<T extends string>(storageKey: string, keys: readonly T[], fallback: T) {
  const [tab, setTab] = useState<T>(fallback);
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey) as T | null;
      if (saved && keys.includes(saved)) setTab(saved);
    } catch {
      // storage unavailable — start on the first tab
    }
    // keys is a constant list
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);
  const choose = (t: T) => {
    setTab(t);
    try {
      localStorage.setItem(storageKey, t);
    } catch {}
  };
  return [tab, choose] as const;
}

/** The tabs across the top of a long settings page; stays in view while it scrolls. */
export function SettingsTabs<T extends string>({
  tabs,
  value,
  onChange,
}: {
  tabs: readonly { key: T; label: string }[];
  value: T;
  onChange: (t: T) => void;
}) {
  return (
    <div role="tablist" className="sticky top-0 z-10 -mx-1 mb-8 flex gap-6 border-b border-admin-border bg-admin-bg px-1 pt-1">
      {tabs.map((t) => (
        <button
          key={t.key}
          type="button"
          role="tab"
          aria-selected={value === t.key}
          onClick={() => onChange(t.key)}
          className={cn(
            "-mb-px border-b-2 pb-2.5 text-[13px] transition-colors",
            value === t.key
              ? "border-admin-ink font-medium text-admin-ink"
              : "border-transparent text-admin-ink-soft hover:text-admin-ink",
          )}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
