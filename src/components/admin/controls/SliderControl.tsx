"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

/** Range plus a typed number, so an exact value doesn't need a steady hand. */
export function SliderControl({
  value,
  onChange,
  min,
  max,
  step = 1,
  unit = "",
  disabled = false,
}: {
  value: number | null | undefined;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  disabled?: boolean;
}) {
  const current = typeof value === "number" && !Number.isNaN(value) ? value : min;

  return (
    <div className={cn("flex items-center gap-3", disabled && "opacity-50")}>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={current}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
        className="min-w-0 flex-1 accent-admin-accent"
      />
      <NumberBox value={current} onChange={onChange} min={min} max={max} step={step} unit={unit} disabled={disabled} />
    </div>
  );
}

/**
 * A number input that lets you clear it and type, committing only numbers.
 * Kept separate so the spacing control can share it.
 */
export function NumberBox({
  value,
  onChange,
  min,
  max,
  step = 1,
  unit = "",
  disabled = false,
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  disabled?: boolean;
}) {
  const [text, setText] = useState(String(value));
  useEffect(() => setText(String(value)), [value]);

  return (
    <span className="flex shrink-0 items-center gap-1 text-[12px] text-admin-ink-soft">
      <input
        type="number"
        value={text}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        onChange={(e) => {
          setText(e.target.value);
          const n = Number(e.target.value);
          if (e.target.value.trim() !== "" && !Number.isNaN(n)) onChange(n);
        }}
        onBlur={() => setText(String(value))}
        className="w-16 rounded-md border border-admin-border-strong bg-admin-surface px-2 py-1 text-right text-[13px] tabular-nums text-admin-ink focus:border-admin-accent focus:outline-none"
      />
      {unit && <span className="w-5">{unit}</span>}
    </span>
  );
}
