"use client";

import { useState, type ReactNode } from "react";
import { ChevronDown, ChevronUp, Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * An editable list of small records — stats, detail rows. Each row shows a
 * one-line summary and opens to its fields; rows move up and down and can be
 * removed. The caller supplies the fields through `renderItem`.
 */
export function ListControl<T extends { id: string }>({
  value,
  onChange,
  newItem,
  summary,
  renderItem,
  addLabel = "Add item",
  onAdd,
  leading,
}: {
  value: T[] | null | undefined;
  onChange: (items: T[]) => void;
  newItem?: () => T;
  summary: (item: T, index: number) => string;
  renderItem?: (item: T, update: (patch: Partial<T>) => void) => ReactNode;
  addLabel?: string;
  /** Replaces the Add button's own behaviour — e.g. opening a picker. */
  onAdd?: () => void;
  /** Shown before a row's summary — e.g. a thumbnail. */
  leading?: (item: T) => ReactNode;
}) {
  const items = value ?? [];
  const [openId, setOpenId] = useState<string | null>(null);

  const update = (id: string, patch: Partial<T>) =>
    onChange(items.map((it) => (it.id === id ? { ...it, ...patch } : it)));
  const move = (index: number, dir: -1 | 1) => {
    const to = index + dir;
    if (to < 0 || to >= items.length) return;
    const next = [...items];
    [next[index], next[to]] = [next[to], next[index]];
    onChange(next);
  };

  return (
    <div className="flex flex-col gap-1.5">
      {items.map((item, i) => {
        const open = openId === item.id;
        return (
          <div key={item.id} className="rounded-md border border-admin-border bg-admin-surface">
            <div className="flex items-center gap-0.5 px-1 py-1">
              {leading?.(item)}
              <button
                type="button"
                onClick={() => setOpenId(open ? null : item.id)}
                className="min-w-0 flex-1 truncate px-1.5 py-0.5 text-left text-[13px] text-admin-ink"
                aria-expanded={open}
              >
                {summary(item, i) || <span className="text-admin-ink-faint">(empty)</span>}
              </button>
              <IconButton title="Move up" disabled={i === 0} onClick={() => move(i, -1)}>
                <ChevronUp size={14} />
              </IconButton>
              <IconButton title="Move down" disabled={i === items.length - 1} onClick={() => move(i, 1)}>
                <ChevronDown size={14} />
              </IconButton>
              <IconButton
                title="Remove"
                danger
                onClick={() => {
                  onChange(items.filter((it) => it.id !== item.id));
                  if (open) setOpenId(null);
                }}
              >
                <X size={14} />
              </IconButton>
            </div>
            {open && renderItem && (
              <div className="flex flex-col gap-2.5 border-t border-admin-border px-2.5 py-2.5">
                {renderItem(item, (patch) => update(item.id, patch))}
              </div>
            )}
          </div>
        );
      })}
      <button
        type="button"
        onClick={() => {
          if (onAdd) return onAdd();
          if (!newItem) return;
          const item = newItem();
          onChange([...items, item]);
          setOpenId(item.id);
        }}
        className="flex items-center justify-center gap-1 rounded-md border border-dashed border-admin-border-strong py-1.5 text-[12px] text-admin-ink-soft hover:border-admin-accent hover:text-admin-ink"
      >
        <Plus size={13} /> {addLabel}
      </button>
    </div>
  );
}

function IconButton({
  title,
  disabled,
  danger,
  onClick,
  children,
}: {
  title: string;
  disabled?: boolean;
  danger?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "rounded p-1 text-admin-ink-faint transition-colors disabled:opacity-30",
        danger ? "hover:text-admin-danger" : "hover:text-admin-ink",
      )}
    >
      {children}
    </button>
  );
}

/** A labelled text input for a list row. */
export function ListItemField({
  label,
  value,
  onChange,
  multiline = false,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  multiline?: boolean;
  placeholder?: string;
}) {
  const cls =
    "w-full rounded-md border border-admin-border-strong bg-admin-surface px-2.5 py-1.5 text-[13px] text-admin-ink placeholder:text-admin-ink-faint focus:border-admin-accent focus:outline-none";
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[12px] font-medium text-admin-ink">{label}</span>
      {multiline ? (
        <textarea rows={3} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} className={cn(cls, "resize-y")} />
      ) : (
        <input type="text" value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} className={cls} />
      )}
    </label>
  );
}
