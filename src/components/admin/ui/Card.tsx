import { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  padded?: boolean;
  header?: ReactNode;
}

export function Card({
  padded = true,
  header,
  children,
  className,
  ...props
}: CardProps) {
  return (
    <div
      className={cn(
        "bg-admin-surface border border-admin-border rounded-lg",
        padded && !header && "p-5",
        className,
      )}
      {...props}
    >
      {header && (
        <div className="flex items-center justify-between px-5 py-4 border-b border-admin-border">
          {header}
        </div>
      )}
      {header ? <div className={cn(padded && "p-5")}>{children}</div> : children}
    </div>
  );
}
