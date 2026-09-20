import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface TopbarProps {
  crumbs?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  className?: string;
}

export function Topbar({
  crumbs,
  title,
  subtitle,
  actions,
  className,
}: TopbarProps) {
  return (
    <div
      className={cn(
        "flex items-start justify-between gap-6 px-7 py-5 bg-admin-surface border-b border-admin-border",
        className,
      )}
    >
      <div className="min-w-0">
        {crumbs && (
          <div className="text-[10px] uppercase tracking-[2px] font-mono text-admin-ink-soft mb-1.5">
            {crumbs}
          </div>
        )}
        <h1 className="font-serif italic text-[26px] leading-[1.1] text-admin-ink truncate">
          {title}
        </h1>
        {subtitle && (
          <p className="text-[12px] text-admin-ink-soft mt-1">{subtitle}</p>
        )}
      </div>
      {actions && (
        <div className="flex items-center gap-2 shrink-0">{actions}</div>
      )}
    </div>
  );
}
