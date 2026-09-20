import { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type Tone = "neutral" | "warn" | "success" | "danger" | "accent";

interface PillProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: Tone;
}

const toneClasses: Record<Tone, string> = {
  neutral:
    "bg-admin-surface-2 text-admin-ink-soft border-admin-border",
  warn: "bg-[#fdf3d8] text-[#8a6612] border-[#ebd9a0]",
  success: "bg-[#dcead8] text-[#3d6a3d] border-[#b4d0ad]",
  danger: "bg-[#f6dcd7] text-[#8a2e25] border-[#e4b2aa]",
  accent: "bg-admin-accent-soft text-admin-accent border-[#e8d0a8]",
};

export function Pill({
  tone = "neutral",
  children,
  className,
  ...props
}: PillProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[10px] font-medium whitespace-nowrap",
        toneClasses[tone],
        className,
      )}
      {...props}
    >
      {children}
    </span>
  );
}
