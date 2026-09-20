import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface FieldProps {
  label?: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  htmlFor?: string;
  inline?: boolean;
  children: ReactNode;
  className?: string;
}

export function Field({
  label,
  hint,
  error,
  htmlFor,
  inline = false,
  children,
  className,
}: FieldProps) {
  if (inline) {
    return (
      <div className={cn("grid grid-cols-[140px_1fr] gap-4 items-start", className)}>
        {label && (
          <label
            htmlFor={htmlFor}
            className="text-[13px] font-medium text-admin-ink pt-2"
          >
            {label}
          </label>
        )}
        <div>
          {children}
          {hint && (
            <p className="mt-1.5 text-[12px] text-admin-ink-soft">{hint}</p>
          )}
          {error && (
            <p className="mt-1.5 text-[12px] text-admin-danger">{error}</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {label && (
        <label
          htmlFor={htmlFor}
          className="text-[13px] font-medium text-admin-ink"
        >
          {label}
        </label>
      )}
      {children}
      {hint && <p className="text-[12px] text-admin-ink-soft">{hint}</p>}
      {error && <p className="text-[12px] text-admin-danger">{error}</p>}
    </div>
  );
}
