"use client";

import { useEffect, useMemo, useState, useSyncExternalStore, type ReactNode } from "react";
import { usePathname, useParams } from "next/navigation";
import { ActionBar, useGetPuck, type Data } from "@puckeditor/core";
import { ClipboardCopy } from "lucide-react";
import { Button, Drawer, Input, Pill } from "@/components/admin/ui";
import { extractFragment } from "@/lib/puck/data-tree";
import { STORIES_INDEX_SLUG } from "@/lib/stories/constants";

/*
 * "Copy to page…": copies the selected block (and everything inside it) to the end of
 * another page or story. The action bar sits in the preview iframe while the drawer
 * belongs to the editor window, so the two talk through this tiny store.
 */

let requested: string | null = null;
const listeners = new Set<() => void>();
const setRequested = (id: string | null) => {
  requested = id;
  listeners.forEach((l) => l());
};
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

/** Puck's action bar plus a "Copy to page…" button. */
export function ActionBarWithCopy({
  label,
  children,
  parentAction,
}: {
  label?: string;
  children: ReactNode;
  parentAction: ReactNode;
}) {
  const getPuck = useGetPuck();
  return (
    <ActionBar>
      <ActionBar.Group>
        {parentAction}
        {label && <ActionBar.Label label={label} />}
      </ActionBar.Group>
      <ActionBar.Group>
        {children}
        <ActionBar.Action
          label="Copy to another page"
          onClick={(e) => {
            e.stopPropagation();
            const id = getPuck().selectedItem?.props?.id as string | undefined;
            if (id) setRequested(id);
          }}
        >
          <ClipboardCopy size={16} />
        </ActionBar.Action>
      </ActionBar.Group>
    </ActionBar>
  );
}

type Target = { id: string; title: string; slug: string; pageType: string; isPublished: boolean };

/** Rendered once per editor (in the header actions); shows the drawer when asked. */
export function CopyToPageDrawer() {
  const blockId = useSyncExternalStore(subscribe, () => requested, () => null);
  const getPuck = useGetPuck();
  const params = useParams<{ id?: string }>();
  const pathname = usePathname();
  const [targets, setTargets] = useState<Target[] | null>(null);
  const [query, setQuery] = useState("");
  const [choice, setChoice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<Target | null>(null);

  const open = blockId !== null;
  const block = useMemo(() => {
    if (!blockId) return null;
    const { appState, config } = getPuck();
    const data = appState.data as Data;
    const fragment = extractFragment(data, [blockId]);
    const first = fragment.content[0];
    if (!first) return null;
    const type = first.type as string;
    return { fragment, label: config.components[type]?.label ?? type };
  }, [blockId, getPuck]);

  useEffect(() => {
    if (!open) return;
    setChoice(null);
    setError(null);
    setDone(null);
    setQuery("");
    Promise.all([fetch("/api/pages"), fetch("/api/stories")])
      .then(async ([p, s]) => [...(p.ok ? await p.json() : []), ...(s.ok ? await s.json() : [])] as Target[])
      .then(setTargets)
      .catch(() => setTargets([]));
  }, [open]);

  // The page open in this editor isn't a target: Puck's own Duplicate covers that.
  const onStoriesIndex = pathname?.includes("/stories/index/");
  const list = (targets ?? []).filter(
    (t) =>
      t.id !== params?.id &&
      !(onStoriesIndex && t.slug === STORIES_INDEX_SLUG) &&
      (!query || t.title.toLowerCase().includes(query.toLowerCase())),
  );
  const name = (t: Target) => (t.slug === STORIES_INDEX_SLUG ? "Stories contents page" : t.title);
  const chosen = list.find((t) => t.id === choice);

  async function copy() {
    if (!block || !choice) return;
    setBusy(true);
    setError(null);
    const res = await fetch("/api/pages/copy-blocks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetId: choice, fragment: block.fragment, label: block.label }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (res.ok) setDone(data as Target);
    else setError(data.error || "Couldn't copy the block.");
  }

  const editHref = (t: Target) =>
    t.slug === STORIES_INDEX_SLUG
      ? "/admin/stories/index/edit"
      : t.pageType === "story"
        ? `/admin/stories/${t.id}/edit`
        : `/admin/pages/${t.id}/edit`;

  return (
    <Drawer
      open={open}
      onClose={() => setRequested(null)}
      eyebrow="Copy block"
      title={block ? `Copy “${block.label}” to…` : "Copy block"}
      footer={
        done ? (
          <>
            <Button type="button" kind="primary" onClick={() => window.open(editHref(done), "_blank")}>
              Open “{name(done)}”
            </Button>
            <Button type="button" kind="ghost" onClick={() => setRequested(null)}>
              Close
            </Button>
          </>
        ) : (
          <>
            <Button type="button" kind="primary" disabled={!chosen || busy || !block} onClick={copy}>
              {busy ? "Copying..." : "Copy"}
            </Button>
            <Button type="button" kind="ghost" onClick={() => setRequested(null)}>
              Cancel
            </Button>
          </>
        )
      }
    >
      {done ? (
        <p className="text-[13px] text-admin-ink">
          Added to the end of “{name(done)}”.{" "}
          {done.isPublished ? "That page is published, so the copy is already live." : "That page is a draft."} To undo
          it, choose History in that page&apos;s ⋯ menu in the {done.pageType === "story" ? "Stories" : "Pages"} list.
        </p>
      ) : (
        <div className="space-y-3">
          <p className="text-[12px] text-admin-ink-soft">
            The block{block && block.fragment.content.length && Object.keys(block.fragment.zones).length ? ", with everything inside it," : ""}{" "}
            goes at the end of the page you choose. It&apos;s saved straight away — if that page is published, the copy
            goes live at once.
          </p>
          {!block && <p className="text-[12px] text-admin-danger">That block is no longer on the page.</p>}
          <Input placeholder="Find a page…" value={query} onChange={(e) => setQuery(e.target.value)} />
          {targets === null ? (
            <p className="text-[13px] text-admin-ink-soft">Loading…</p>
          ) : list.length === 0 ? (
            <p className="text-[13px] text-admin-ink-soft">No other pages.</p>
          ) : (
            <ul className="divide-y divide-admin-border rounded-md border border-admin-border">
              {list.map((t) => (
                <li key={t.id}>
                  <label className="flex cursor-pointer items-center gap-2.5 px-3 py-2 text-[13px] hover:bg-admin-surface-2">
                    <input
                      type="radio"
                      name="copy-target"
                      checked={choice === t.id}
                      onChange={() => setChoice(t.id)}
                      className="accent-admin-accent"
                    />
                    <span className="min-w-0 flex-1 truncate text-admin-ink">{name(t)}</span>
                    {t.pageType === "story" && <Pill>Story</Pill>}
                    {!t.isPublished && <Pill>Draft</Pill>}
                  </label>
                </li>
              ))}
            </ul>
          )}
          {error && <p className="text-[12px] text-admin-danger">{error}</p>}
        </div>
      )}
    </Drawer>
  );
}
