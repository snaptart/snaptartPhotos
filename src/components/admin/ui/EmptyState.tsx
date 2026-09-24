import type { ReactNode } from "react";

/** What a list shows when there's nothing in it yet — the same everywhere in the admin. */
export function EmptyState({ title, body, action }: { title: string; body?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="mb-2 font-serif text-[22px] italic text-admin-ink">{title}</div>
      {body && <p className="max-w-sm text-[13px] text-admin-ink-soft">{body}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
