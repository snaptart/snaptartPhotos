"use client";

import { COLOR_TOKENS } from "@/lib/theme/types";
import { colorTokenOf, isHexColor, tokenColor } from "@/lib/theme/color";
import { useActiveTheme } from "@/lib/theme/use-active-theme";
import { cn } from "@/lib/utils";

const CHECKER = "repeating-conic-gradient(#e4e1db 0% 25%, #fff 0% 50%) 50% / 8px 8px";

/**
 * The one colour picker. Theme colours come first as swatches, so the usual
 * choice follows the preset; a fixed hex is the fallback, not the default.
 *
 * Settings pages that *define* the theme colours pass `tokens={false}` — a
 * token there would point at itself.
 */
export function ColorControl({
  value,
  onChange,
  tokens = true,
  allowTransparent = false,
  emptyLabel,
  placeholder = "#000000",
  disabled = false,
}: {
  value: string | null | undefined;
  onChange: (v: string) => void;
  tokens?: boolean;
  allowTransparent?: boolean;
  /** Offer a "not set" choice with this name (e.g. "Theme hairline"). Stores "". */
  emptyLabel?: string;
  placeholder?: string;
  disabled?: boolean;
}) {
  const theme = useActiveTheme(tokens);
  const current = value ?? "";
  const token = colorTokenOf(current);
  const tokenMeta = token ? COLOR_TOKENS.find((t) => t.key === token) : null;
  const isTransparent = current === "transparent";
  const isEmpty = current === "";

  const swatchOf = (field: (typeof COLOR_TOKENS)[number]["field"]) =>
    theme ? (theme[field] as string) : "#e4e1db";

  const previewBg = tokenMeta
    ? swatchOf(tokenMeta.field)
    : isHexColor(current)
      ? current
      : undefined;

  return (
    <div className={cn("flex flex-col gap-2", disabled && "opacity-50 pointer-events-none")}>
      {tokens && (
        <div className="flex flex-wrap items-center gap-1.5" role="radiogroup" aria-label="Theme colours">
          {COLOR_TOKENS.map((t) => {
            const selected = token === t.key;
            return (
              <button
                key={t.key}
                type="button"
                role="radio"
                aria-checked={selected}
                title={`${t.label} (theme)`}
                onClick={() => onChange(tokenColor(t.key))}
                className={cn(
                  "h-6 w-6 rounded-full border border-admin-border-strong transition-shadow",
                  selected && "ring-2 ring-admin-accent ring-offset-2",
                )}
                style={{ background: swatchOf(t.field) }}
              />
            );
          })}
        </div>
      )}

      <div className="flex items-center gap-2">
        <label
          className="relative inline-block h-8 w-8 shrink-0 cursor-pointer overflow-hidden rounded-md border border-admin-border-strong"
          title="Pick a custom colour"
        >
          <input
            type="color"
            value={previewBg && isHexColor(previewBg) ? previewBg : "#ffffff"}
            onChange={(e) => onChange(e.target.value)}
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
            aria-label="Pick a custom colour"
          />
          <span
            className="absolute inset-0 block"
            style={previewBg ? { background: previewBg } : { background: CHECKER }}
          />
        </label>

        {tokenMeta ? (
          <span className="flex-1 truncate rounded-md border border-admin-border bg-admin-surface-2 px-2.5 py-1.5 text-[13px] text-admin-ink">
            {tokenMeta.label} <span className="text-admin-ink-faint">· theme</span>
          </span>
        ) : (
          <input
            type="text"
            value={isTransparent ? "" : current}
            placeholder={isTransparent ? "transparent" : isEmpty && emptyLabel ? emptyLabel : placeholder}
            onChange={(e) => onChange(e.target.value.trim())}
            maxLength={9}
            className="min-w-0 flex-1 rounded-md border border-admin-border-strong bg-admin-surface px-2.5 py-1.5 font-mono text-[13px] text-admin-ink placeholder:font-sans placeholder:text-admin-ink-faint focus:border-admin-accent focus:outline-none"
          />
        )}

        {allowTransparent && (
          <ChipButton active={isTransparent} onClick={() => onChange(isTransparent ? "#ffffff" : "transparent")}>
            None
          </ChipButton>
        )}
        {emptyLabel !== undefined && !isEmpty && (
          <ChipButton onClick={() => onChange("")} title={`Back to: ${emptyLabel}`}>
            Default
          </ChipButton>
        )}
      </div>
    </div>
  );
}

function ChipButton({
  active,
  onClick,
  title,
  children,
}: {
  active?: boolean;
  onClick: () => void;
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={cn(
        "shrink-0 rounded-md border px-2 py-1 text-[12px] transition-colors",
        active
          ? "border-admin-accent bg-admin-accent-soft text-admin-ink"
          : "border-admin-border text-admin-ink-soft hover:border-admin-border-strong hover:text-admin-ink",
      )}
    >
      {children}
    </button>
  );
}
