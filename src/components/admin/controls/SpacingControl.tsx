"use client";

import { SPACE_SCALE } from "@/lib/theme/layout";
import { cn } from "@/lib/utils";
import { NumberBox } from "./SliderControl";

/** The spacing scale as stops, with a typed value for anything in between. */
export function SpacingControl({
  value,
  onChange,
  max = 240,
  disabled = false,
}: {
  value: number | null | undefined;
  onChange: (v: number) => void;
  max?: number;
  disabled?: boolean;
}) {
  const current = typeof value === "number" ? value : 0;
  return (
    <div className={cn("flex items-center gap-2", disabled && "opacity-50 pointer-events-none")}>
      <SegmentedControl
        options={SPACE_SCALE.map((s) => ({ label: s.label, value: s.value, title: `${s.value}px` }))}
        value={current}
        onChange={(v) => onChange(v as number)}
        compact
        className="min-w-0 flex-1"
      />
      <NumberBox value={current} onChange={onChange} min={0} max={max} unit="px" />
    </div>
  );
}

export function SegmentedControl({
  options,
  value,
  onChange,
  disabled = false,
  compact = false,
  className,
}: {
  options: { label: string; value: unknown; title?: string }[];
  value: unknown;
  onChange: (v: unknown) => void;
  disabled?: boolean;
  /** Tighter buttons, for a scale that has to fit beside another control. */
  compact?: boolean;
  className?: string;
}) {
  // Buttons grow to share the row, so a control stretched to the panel's
  // width is filled rather than leaving an empty box beside its options.
  return (
    <div
      role="radiogroup"
      className={cn(
        "inline-flex max-w-full flex-wrap overflow-hidden rounded-md border border-admin-border-strong",
        disabled && "opacity-50 pointer-events-none",
        className,
      )}
    >
      {options.map((opt, i) => {
        const selected = opt.value === value;
        return (
          <button
            key={`${opt.label}-${i}`}
            type="button"
            role="radio"
            aria-checked={selected}
            title={opt.title}
            onClick={() => onChange(opt.value)}
            className={cn(
              "flex-auto py-1 text-[12px] whitespace-nowrap transition-colors",
              compact ? "px-1.5" : "px-2.5",
              i > 0 && "border-l border-admin-border-strong",
              selected
                ? "bg-admin-ink text-admin-surface"
                : "bg-admin-surface text-admin-ink-soft hover:bg-admin-surface-2 hover:text-admin-ink",
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
