"use client";

import { cn } from "@/lib/utils";

export type Position =
  | "top-left" | "top-center" | "top-right"
  | "center-left" | "center" | "center-right"
  | "bottom-left" | "bottom-center" | "bottom-right";

const GRID: Position[] = [
  "top-left", "top-center", "top-right",
  "center-left", "center", "center-right",
  "bottom-left", "bottom-center", "bottom-right",
];

const LABELS: Record<Position, string> = {
  "top-left": "Top left",
  "top-center": "Top",
  "top-right": "Top right",
  "center-left": "Left",
  center: "Centre",
  "center-right": "Right",
  "bottom-left": "Bottom left",
  "bottom-center": "Bottom",
  "bottom-right": "Bottom right",
};

export function positionLabel(p: Position | "" | undefined, empty = "Centre"): string {
  return p ? LABELS[p] : empty;
}

/**
 * Where something sits in a box: a 3×3 grid of spots. With `inheritLabel`, an
 * extra choice ("Same as desktop") stores "" and follows another setting.
 */
export function PositionControl({
  value,
  onChange,
  inheritLabel,
}: {
  value: Position | "" | undefined;
  onChange: (v: Position | "") => void;
  inheritLabel?: string;
}) {
  const inherit = !!inheritLabel && !value;
  return (
    <div className="flex items-start gap-3">
      <div
        role="radiogroup"
        className={cn(
          "grid grid-cols-3 gap-px overflow-hidden rounded-md border border-admin-border-strong bg-admin-border-strong",
          inherit && "opacity-50",
        )}
      >
        {GRID.map((p) => {
          const selected = value === p;
          return (
            <button
              key={p}
              type="button"
              role="radio"
              aria-checked={selected}
              aria-label={LABELS[p]}
              title={LABELS[p]}
              onClick={() => onChange(p)}
              className={cn(
                "flex h-7 w-9 items-center justify-center transition-colors",
                selected ? "bg-admin-ink" : "bg-admin-surface hover:bg-admin-surface-2",
              )}
            >
              <span className={cn("h-1.5 w-1.5 rounded-full", selected ? "bg-admin-surface" : "bg-admin-ink-faint")} />
            </button>
          );
        })}
      </div>
      {inheritLabel && (
        <button
          type="button"
          aria-pressed={inherit}
          onClick={() => onChange("")}
          className={cn(
            "rounded-md border border-admin-border-strong px-2.5 py-1 text-[12px] whitespace-nowrap transition-colors",
            inherit
              ? "bg-admin-ink text-admin-surface"
              : "bg-admin-surface text-admin-ink-soft hover:bg-admin-surface-2 hover:text-admin-ink",
          )}
        >
          {inheritLabel}
        </button>
      )}
    </div>
  );
}
