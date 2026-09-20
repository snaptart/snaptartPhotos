import { forwardRef, ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

type Kind = "primary" | "ghost" | "subtle" | "accent" | "danger";
type Size = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  kind?: Kind;
  size?: Size;
  icon?: ReactNode;
}

const kindClasses: Record<Kind, string> = {
  primary:
    "bg-admin-ink text-admin-surface border border-admin-ink hover:opacity-90",
  ghost:
    "bg-admin-surface text-admin-ink border border-admin-border-strong hover:bg-admin-surface-2",
  subtle:
    "bg-transparent text-admin-ink-soft border border-transparent hover:bg-admin-surface-2",
  accent:
    "bg-admin-accent text-white border border-admin-accent hover:opacity-90",
  danger:
    "bg-transparent text-admin-danger border border-admin-danger hover:bg-admin-danger/5",
};

const sizeClasses: Record<Size, string> = {
  sm: "px-2.5 py-1 text-xs",
  md: "px-3.5 py-2 text-[13px]",
  lg: "px-4 py-2.5 text-sm",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { kind = "ghost", size = "md", icon, children, className, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md font-medium whitespace-nowrap transition-transform active:translate-y-px disabled:opacity-50 disabled:cursor-not-allowed",
        kindClasses[kind],
        sizeClasses[size],
        className,
      )}
      {...props}
    >
      {icon && <span className="opacity-80">{icon}</span>}
      {children}
    </button>
  );
});
