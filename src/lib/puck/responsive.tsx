"use client";

import type { CSSProperties, ReactNode } from "react";
import { SegmentedControl } from "@/components/admin/controls";
import { cn } from "@/lib/utils";

/*
 * How blocks change between phone, tablet and desktop.
 *
 * Grids measure their own width (a container query), like Columns, so a grid in
 * a narrow column or the editor's preview behaves as it would on that screen:
 *   phone  — under 32rem (512px) wide
 *   tablet — 32rem to 48rem (768px)
 *   desktop — 48rem and up
 *
 * Showing and hiding a block follows the screen, since that is what "on phones"
 * means to whoever sets it: phone under 640px, tablet 640-1023px, desktop 1024px+.
 * The editor's preview is an iframe as wide as the chosen viewport, so these
 * apply there too.
 */

// ----- Grid columns -----

export type PhoneColumns = "auto" | "1" | "2";
export type TabletColumns = "auto" | "1" | "2" | "3";

const PHONE_OPTIONS: { label: string; value: PhoneColumns; title?: string }[] = [
  { label: "Auto", value: "auto", title: "One column" },
  { label: "1", value: "1" },
  { label: "2", value: "2" },
];
const TABLET_OPTIONS: { label: string; value: TabletColumns; title?: string }[] = [
  { label: "Auto", value: "auto", title: "Two columns, or fewer if the block has fewer" },
  { label: "1", value: "1" },
  { label: "2", value: "2" },
  { label: "3", value: "3" },
];

/** Column counts at each width; "auto" is one on phones and at most two on tablets. */
export function columnCounts(columns: number, tablet?: string, phone?: string) {
  return {
    desktop: columns,
    tablet: tablet && tablet !== "auto" ? Number(tablet) : Math.min(columns, 2),
    phone: phone && phone !== "auto" ? Number(phone) : 1,
  };
}

const vars = (c: ReturnType<typeof columnCounts>) =>
  ({ "--cols": c.desktop, "--cols-tablet": c.tablet, "--cols-phone": c.phone }) as CSSProperties;

/**
 * A grid whose column count follows its own width. Put it inside an element
 * with the `@container` class.
 */
export function responsiveGrid(columns: number, tablet?: string, phone?: string) {
  return {
    className:
      "grid grid-cols-[repeat(var(--cols-phone),minmax(0,1fr))] @min-[32rem]:grid-cols-[repeat(var(--cols-tablet),minmax(0,1fr))] @min-[48rem]:grid-cols-[repeat(var(--cols),minmax(0,1fr))]",
    style: vars(columnCounts(columns, tablet, phone)),
  };
}

/** The same for CSS columns (a masonry flow). */
export function responsiveColumns(columns: number, tablet?: string, phone?: string) {
  return {
    className: "columns-[var(--cols-phone)] @min-[32rem]:columns-[var(--cols-tablet)] @min-[48rem]:columns-[var(--cols)]",
    style: vars(columnCounts(columns, tablet, phone)),
  };
}

export const phoneColumnsField = {
  type: "custom" as const,
  label: "Columns on phones",
  render: ({ value, onChange }: { value?: PhoneColumns; onChange: (v: PhoneColumns) => void }) => (
    <SegmentedControl options={PHONE_OPTIONS} value={value ?? "auto"} onChange={(v) => onChange(v as PhoneColumns)} />
  ),
};

export const tabletColumnsField = {
  type: "custom" as const,
  label: "Columns on tablets",
  render: ({ value, onChange }: { value?: TabletColumns; onChange: (v: TabletColumns) => void }) => (
    <SegmentedControl options={TABLET_OPTIONS} value={value ?? "auto"} onChange={(v) => onChange(v as TabletColumns)} />
  ),
};

/** "3 columns · 2 on tablets · 1 on phones" */
export function columnsSummary(columns: number, tablet?: string, phone?: string): string {
  const c = columnCounts(columns, tablet, phone);
  return `${c.desktop} columns · ${c.tablet} on tablets · ${c.phone} on phones`;
}

// ----- Show on -----

export type Breakpoint = "phone" | "tablet" | "desktop";
const BREAKPOINTS: { key: Breakpoint; label: string; plural: string }[] = [
  { key: "phone", label: "Phone", plural: "phones" },
  { key: "tablet", label: "Tablet", plural: "tablets" },
  { key: "desktop", label: "Desktop", plural: "desktops" },
];

// Written out in full so Tailwind finds every class.
const HIDDEN: Record<Breakpoint, string> = {
  phone: "max-sm:hidden",
  tablet: "sm:max-lg:hidden",
  desktop: "lg:hidden",
};
// In the editor a hidden block stays selectable: faded, outlined and labelled.
const FADED: Record<Breakpoint, string> = {
  phone: "max-sm:opacity-40 max-sm:outline-1 max-sm:outline-dashed max-sm:outline-neutral-400",
  tablet: "sm:max-lg:opacity-40 sm:max-lg:outline-1 sm:max-lg:outline-dashed sm:max-lg:outline-neutral-400",
  desktop: "lg:opacity-40 lg:outline-1 lg:outline-dashed lg:outline-neutral-400",
};
const BADGE: Record<Breakpoint, string> = {
  phone: "hidden max-sm:block",
  tablet: "hidden sm:max-lg:block",
  desktop: "hidden lg:block",
};

export function hideOnSummary(hideOn: Breakpoint[] | undefined): string {
  const hidden = BREAKPOINTS.filter((b) => hideOn?.includes(b.key));
  if (hidden.length === 0) return "Everywhere";
  if (hidden.length === 3) return "Nowhere";
  return `Not on ${hidden.map((b) => b.plural).join(" or ")}`;
}

/** Which screens the block appears on. Stored as the ones it's hidden on, so blocks saved before it show everywhere. */
export function ShowOnControl({ value, onChange }: { value?: Breakpoint[]; onChange: (v: Breakpoint[]) => void }) {
  const hidden = value ?? [];
  return (
    <div className="inline-flex max-w-full overflow-hidden rounded-md border border-admin-border-strong" role="group">
      {BREAKPOINTS.map((b, i) => {
        const shown = !hidden.includes(b.key);
        return (
          <button
            key={b.key}
            type="button"
            aria-pressed={shown}
            onClick={() => onChange(shown ? [...hidden, b.key] : hidden.filter((k) => k !== b.key))}
            className={cn(
              "flex-auto px-2.5 py-1 text-[12px] whitespace-nowrap transition-colors",
              i > 0 && "border-l border-admin-border-strong",
              shown
                ? "bg-admin-ink text-admin-surface"
                : "bg-admin-surface text-admin-ink-soft line-through hover:bg-admin-surface-2 hover:text-admin-ink",
            )}
          >
            {b.label}
          </button>
        );
      })}
    </div>
  );
}

export const hideOnField = {
  type: "custom" as const,
  label: "Show on",
  render: ({ value, onChange }: { value?: Breakpoint[]; onChange: (v: Breakpoint[]) => void }) => (
    <ShowOnControl value={value} onChange={onChange} />
  ),
};

/**
 * Hides its block on the chosen screens. `display: contents` keeps the wrapper
 * out of the layout, so a block inside Columns or Rows sits exactly as before.
 */
export function BreakpointVisibility({
  hideOn,
  editing,
  children,
}: {
  hideOn?: Breakpoint[];
  editing?: boolean;
  children: ReactNode;
}) {
  if (!hideOn?.length) return <>{children}</>;
  const hidden = BREAKPOINTS.filter((b) => hideOn.includes(b.key));
  if (!editing) return <div className={cn("contents", ...hidden.map((b) => HIDDEN[b.key]))}>{children}</div>;
  return (
    <div className={cn("relative", ...hidden.map((b) => FADED[b.key]))}>
      {hidden.map((b) => (
        <span
          key={b.key}
          className={cn(
            BADGE[b.key],
            "pointer-events-none absolute right-1 top-1 z-10 rounded bg-neutral-800 px-1.5 py-0.5 font-sans text-[10px] text-white",
          )}
        >
          Hidden on {b.plural}
        </span>
      ))}
      {children}
    </div>
  );
}
