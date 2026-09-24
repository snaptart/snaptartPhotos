"use client";

import { useEffect, useState, type ReactNode } from "react";
import { RotateCcw } from "lucide-react";
import {
  COLOR_TOKENS,
  ROLE_DEFAULTS,
  ROLE_FAMILY_FIELDS,
  ROLE_LABELS,
  TEXT_STYLE_DEFAULTS,
  TEXT_STYLE_KEYS,
  TEXT_STYLE_LABELS,
  resolveTextStyles,
  type FontRoleKey,
  type TextStyleKey,
} from "@/lib/theme/types";
import {
  hasAdjustments,
  type TextCase,
  type TextStyleValue,
} from "@/lib/theme/text-style-value";
import { useActiveTheme } from "@/lib/theme/use-active-theme";
import { cn } from "@/lib/utils";
import { ColorControl } from "./ColorControl";

const SMALL =
  "w-full rounded-md border border-admin-border-strong bg-admin-surface px-2 py-1 text-[12px] focus:border-admin-accent focus:outline-none";

const ROLE_KEYS = Object.keys(ROLE_LABELS) as FontRoleKey[];

const CASE_LABELS: Record<TextCase, string> = {
  none: "None",
  uppercase: "UPPERCASE",
  lowercase: "lowercase",
  capitalize: "Capitalize",
};

/**
 * Pick a theme text style, then adjust it. Every setting stays visible: one
 * still following the style shows the style's value in grey; one you've set
 * shows yours, with a dot and a reset back to the style.
 */
export function TextStyleControl({
  value,
  onChange,
  fallback,
  withColor = true,
}: {
  value: TextStyleValue | undefined;
  onChange: (v: TextStyleValue) => void;
  /** The style used when nothing is stored yet. */
  fallback: TextStyleKey;
  /** Off for blocks whose text colour has its own (hover-aware) field. */
  withColor?: boolean;
}) {
  const theme = useActiveTheme();
  const current: TextStyleValue = value ?? { style: fallback };
  const styles = resolveTextStyles(theme?.textStyles);
  const st = styles[current.style] ?? TEXT_STYLE_DEFAULTS[current.style];
  const role = { ...ROLE_DEFAULTS[st.role], ...(theme?.fontStyles?.[st.role] ?? {}) };

  // What each setting is when nothing is adjusted.
  const inherited = {
    role: st.role,
    size: st.size,
    lineHeight: st.lineHeight,
    weight: st.weight ?? role.weight,
    italic: st.italic ?? role.italic,
    transform: ((st.uppercase ?? role.uppercase) ? "uppercase" : "none") as TextCase,
    tracking: st.tracking ?? role.tracking ?? 0,
  };
  const familyOf = (r: FontRoleKey) => (theme ? (theme[ROLE_FAMILY_FIELDS[r]] as string) : "");
  const colorToken = COLOR_TOKENS.find((t) => t.key === st.color) ?? COLOR_TOKENS[0];

  function set<K extends keyof TextStyleValue>(key: K, v: TextStyleValue[K] | undefined) {
    const next = { ...current };
    if (v === undefined || v === "") delete next[key];
    else next[key] = v;
    onChange(next);
  }

  return (
    <div className="flex flex-col gap-2.5">
      <select
        value={current.style}
        onChange={(e) => onChange({ ...current, style: e.target.value as TextStyleKey })}
        className="w-full rounded-md border border-admin-border-strong bg-admin-surface px-2.5 py-1.5 text-[13px] font-medium text-admin-ink focus:border-admin-accent focus:outline-none"
      >
        {TEXT_STYLE_KEYS.map((k) => (
          <option key={k} value={k}>
            {TEXT_STYLE_LABELS[k]} — {styles[k].size}px
          </option>
        ))}
      </select>

      <div className="grid grid-cols-2 gap-x-2 gap-y-2">
        <Knob label="Font" adjusted={current.role !== undefined} onReset={() => set("role", undefined)} wide>
          <select
            value={current.role ?? ""}
            onChange={(e) => set("role", (e.target.value || undefined) as FontRoleKey | undefined)}
            className={cn(SMALL, current.role === undefined && "text-admin-ink-faint")}
          >
            <option value="">
              {ROLE_LABELS[inherited.role]}
              {familyOf(inherited.role) ? ` (${familyOf(inherited.role)})` : ""}
            </option>
            {ROLE_KEYS.map((r) => (
              <option key={r} value={r} className="text-admin-ink">
                {ROLE_LABELS[r]}
                {familyOf(r) ? ` (${familyOf(r)})` : ""}
              </option>
            ))}
          </select>
        </Knob>

        <Knob label="Size" adjusted={current.size !== undefined} onReset={() => set("size", undefined)}>
          <NumKnob value={current.size} placeholder={inherited.size} unit="px" min={6} max={200} step={1} onChange={(n) => set("size", n)} />
        </Knob>
        <Knob label="Leading" adjusted={current.lineHeight !== undefined} onReset={() => set("lineHeight", undefined)}>
          <NumKnob value={current.lineHeight} placeholder={inherited.lineHeight} min={0.8} max={3} step={0.01} onChange={(n) => set("lineHeight", n)} />
        </Knob>

        <Knob label="Weight" adjusted={current.weight !== undefined} onReset={() => set("weight", undefined)}>
          <select
            value={current.weight ?? ""}
            onChange={(e) => set("weight", e.target.value ? Number(e.target.value) : undefined)}
            className={cn(SMALL, current.weight === undefined && "text-admin-ink-faint")}
          >
            <option value="">{inherited.weight}</option>
            {[300, 400, 500, 600, 700, 800].map((w) => (
              <option key={w} value={w} className="text-admin-ink">
                {w}
              </option>
            ))}
          </select>
        </Knob>
        <Knob label="Spacing" adjusted={current.tracking !== undefined} onReset={() => set("tracking", undefined)}>
          <NumKnob value={current.tracking} placeholder={inherited.tracking} unit="em" min={-0.1} max={0.6} step={0.01} onChange={(n) => set("tracking", n)} />
        </Knob>

        <Knob label="Case" adjusted={current.transform !== undefined} onReset={() => set("transform", undefined)}>
          <select
            value={current.transform ?? ""}
            onChange={(e) => set("transform", (e.target.value || undefined) as TextCase | undefined)}
            className={cn(SMALL, current.transform === undefined && "text-admin-ink-faint")}
          >
            <option value="">{CASE_LABELS[inherited.transform]}</option>
            {(Object.keys(CASE_LABELS) as TextCase[]).map((c) => (
              <option key={c} value={c} className="text-admin-ink">
                {CASE_LABELS[c]}
              </option>
            ))}
          </select>
        </Knob>
        <Knob label="Italic" adjusted={current.italic !== undefined} onReset={() => set("italic", undefined)}>
          <select
            value={current.italic === undefined ? "" : current.italic ? "on" : "off"}
            onChange={(e) => set("italic", e.target.value === "" ? undefined : e.target.value === "on")}
            className={cn(SMALL, current.italic === undefined && "text-admin-ink-faint")}
          >
            <option value="">{inherited.italic ? "On" : "Off"}</option>
            <option value="on" className="text-admin-ink">On</option>
            <option value="off" className="text-admin-ink">Off</option>
          </select>
        </Knob>

        {withColor && (
          <Knob label="Color" adjusted={current.color !== undefined} onReset={() => set("color", undefined)} wide>
            <ColorControl
              value={current.color ?? ""}
              onChange={(v) => set("color", v || undefined)}
              emptyLabel={`${colorToken.label} (from style)`}
            />
          </Knob>
        )}
      </div>

      {hasAdjustments(value) && (
        <button
          type="button"
          onClick={() => onChange({ style: current.style })}
          className="self-start text-[12px] text-admin-ink-soft underline-offset-2 hover:text-admin-accent hover:underline"
        >
          Clear adjustments — use {TEXT_STYLE_LABELS[current.style]} as set in the theme
        </button>
      )}
    </div>
  );
}

function Knob({
  label,
  adjusted,
  onReset,
  wide = false,
  children,
}: {
  label: string;
  adjusted: boolean;
  onReset: () => void;
  wide?: boolean;
  children: ReactNode;
}) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-1", wide && "col-span-2")}>
      <div className="flex min-h-4 items-center gap-1">
        <span className={cn("text-[11px]", adjusted ? "text-admin-ink" : "text-admin-ink-soft")}>{label}</span>
        {adjusted && (
          <>
            <span className="h-1.5 w-1.5 rounded-full bg-admin-accent" title="Adjusted from the style" />
            <button
              type="button"
              onClick={onReset}
              title="Back to the style's value"
              aria-label={`Reset ${label} to the style's value`}
              className="ml-auto rounded p-0.5 text-admin-ink-faint hover:text-admin-accent"
            >
              <RotateCcw size={11} />
            </button>
          </>
        )}
      </div>
      {children}
    </div>
  );
}

/** A number that shows the inherited value as its placeholder until set. */
function NumKnob({
  value,
  placeholder,
  unit,
  min,
  max,
  step,
  onChange,
}: {
  value: number | undefined;
  placeholder: number | null;
  unit?: string;
  min: number;
  max: number;
  step: number;
  onChange: (n: number | undefined) => void;
}) {
  const [text, setText] = useState(value == null ? "" : String(value));
  useEffect(() => setText(value == null ? "" : String(value)), [value]);
  return (
    <span className="flex items-center gap-1">
      <input
        type="number"
        value={text}
        min={min}
        max={max}
        step={step}
        placeholder={placeholder == null ? "" : String(placeholder)}
        onChange={(e) => {
          setText(e.target.value);
          const raw = e.target.value.trim();
          if (raw === "") return onChange(undefined);
          const n = Number(raw);
          if (!Number.isNaN(n)) onChange(n);
        }}
        className={cn(SMALL, "tabular-nums placeholder:text-admin-ink-faint")}
      />
      {unit && <span className="text-[11px] text-admin-ink-soft">{unit}</span>}
    </span>
  );
}
