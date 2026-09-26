"use client";

import { useEffect, useState } from "react";
import { Button, Drawer } from "@/components/admin/ui";

type Revision = { id: string; reason: string; batchId: string | null; createdAt: string };

/**
 * A page's saved revisions: its content just before each change made outside the editor
 * (a block copied in, block defaults applied). Restoring one saves the current content first.
 */
export function PageHistoryDrawer({
  page,
  onClose,
  onRestored,
}: {
  page: { id: string; title: string } | null;
  onClose: () => void;
  onRestored?: () => void;
}) {
  const [revisions, setRevisions] = useState<Revision[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);

  const load = (id: string) =>
    fetch(`/api/pages/revisions?pageId=${id}`)
      .then((r) => (r.ok ? r.json() : []))
      .then(setRevisions)
      .catch(() => setRevisions([]));

  useEffect(() => {
    setRevisions(null);
    setNote(null);
    if (page) load(page.id);
  }, [page]);

  async function restore(rev: Revision) {
    if (!page) return;
    if (!confirm(`Put "${page.title}" back as it was before “${rev.reason}”? Any edits made since then are replaced (they're saved here first, so you can switch back).`)) return;
    setBusy(rev.id);
    const res = await fetch("/api/pages/revisions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ revisionId: rev.id }),
    });
    setBusy(null);
    setNote(res.ok ? { ok: true, text: "Restored." } : { ok: false, text: "Couldn't restore that revision." });
    if (res.ok) {
      load(page.id);
      onRestored?.();
    }
  }

  return (
    <Drawer open={!!page} onClose={onClose} eyebrow="History" title={page?.title ?? ""}>
      <div className="space-y-3">
        <p className="text-[12px] text-admin-ink-soft">
          Saved automatically before a change made from outside this page&apos;s editor: a block copied in from another
          page, or block defaults applied across the site. Edits made in the editor itself aren&apos;t listed. The last 20
          are kept.
        </p>
        {note && <p className={`text-[13px] ${note.ok ? "text-admin-ink" : "text-admin-danger"}`}>{note.text}</p>}
        {revisions === null ? (
          <p className="text-[13px] text-admin-ink-soft">Loading…</p>
        ) : revisions.length === 0 ? (
          <p className="text-[13px] text-admin-ink-soft">Nothing yet.</p>
        ) : (
          <ul className="divide-y divide-admin-border rounded-md border border-admin-border">
            {revisions.map((rev) => (
              <li key={rev.id} className="flex items-center gap-3 px-3 py-2.5">
                <div className="min-w-0 flex-1">
                  <div className="text-[13px] text-admin-ink">Before: {rev.reason}</div>
                  <div className="text-[12px] text-admin-ink-soft">{new Date(rev.createdAt).toLocaleString()}</div>
                </div>
                <Button size="sm" disabled={busy !== null} onClick={() => restore(rev)}>
                  {busy === rev.id ? "Restoring…" : "Restore"}
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Drawer>
  );
}
