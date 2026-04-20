import { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

interface SectionLabelProps extends HTMLAttributes<HTMLDivElement> {
  aside?: ReactNode;
}

export function SectionLabel({
  children,
  aside,
  className,
  ...props
}: SectionLabelProps) {
  return (
    <div
      className={cn(
        "flex items-baseline justify-between text-[10px] uppercase tracking-[2px] font-mono text-admin-ink-soft",
        className,
      )}
      {...props}
    >
      <span>{children}</span>
      {aside && <span className="text-admin-ink-faint">{aside}</span>}
    </div>
  );
}
