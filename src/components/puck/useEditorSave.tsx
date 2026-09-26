"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Data } from "@puckeditor/core";

type Status = "idle" | "saving" | "saved" | "error";

/** How long after the editor opens its own tidy-ups (block migrations) still count as the starting point. */
const SETTLE_MS = 2000;

/** What the status badge and leave warning call a save; the block-defaults editor "saves" rather than "publishes". */
export type EditorSaveWords = { pending: string; saving: string; saved: string; failed: string; leave: string };

const PUBLISH_WORDS: EditorSaveWords = {
  pending: "Unpublished changes",
  saving: "Publishing…",
  saved: "Published",
  failed: "Couldn't publish. Your changes are still here — try again.",
  leave: "You have changes that aren't published yet. Leave and lose them?",
};

/**
 * Publishing for the page editors: reports whether the save worked, and warns
 * before a visitor leaves (closing the tab, or following a link out of the
 * editor) with changes that aren't published.
 */
export function useEditorSave(save: (data: Data) => Promise<Response>, words: EditorSaveWords = PUBLISH_WORDS) {
  const [status, setStatus] = useState<Status>("idle");
  const [dirty, setDirty] = useState(false);
  const saved = useRef<string | null>(null);
  const settleUntil = useRef(0);
  const doneTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  /** The document as loaded; call once the editor has its data. */
  const begin = useCallback((data: Data) => {
    saved.current = JSON.stringify(data);
    settleUntil.current = Date.now() + SETTLE_MS;
    setDirty(false);
  }, []);

  const onChange = useCallback((data: Data) => {
    const now = JSON.stringify(data);
    // Changes Puck makes while opening (resolveData migrations) aren't the user's.
    if (Date.now() < settleUntil.current) {
      saved.current = now;
      return;
    }
    setDirty(now !== saved.current);
  }, []);

  const onPublish = useCallback(
    async (data: Data) => {
      setStatus("saving");
      if (doneTimer.current) clearTimeout(doneTimer.current);
      try {
        const res = await save(data);
        if (!res.ok) throw new Error(String(res.status));
        saved.current = JSON.stringify(data);
        setDirty(false);
        setStatus("saved");
        doneTimer.current = setTimeout(() => setStatus("idle"), 2500);
      } catch {
        setStatus("error");
      }
    },
    [save],
  );

  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    // Links out of the editor (the sidebar, "View Site"…) navigate inside the
    // app, where beforeunload never fires, so ask on the click instead.
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as HTMLElement | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!a || a.target === "_blank" || a.origin !== window.location.origin) return;
      if (a.pathname === window.location.pathname) return;
      if (!window.confirm(words.leave)) {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    document.addEventListener("click", onClick, true);
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      document.removeEventListener("click", onClick, true);
    };
  }, [dirty, words.leave]);

  useEffect(() => () => {
    if (doneTimer.current) clearTimeout(doneTimer.current);
  }, []);

  const statusEl = <EditorStatus status={status} dirty={dirty} words={words} onDismiss={() => setStatus("idle")} />;
  return { begin, onChange, onPublish, status, dirty, statusEl };
}

function EditorStatus({
  status,
  dirty,
  words,
  onDismiss,
}: {
  status: Status;
  dirty: boolean;
  words: EditorSaveWords;
  onDismiss: () => void;
}) {
  if (status === "idle") {
    if (!dirty) return null;
    return (
      <div className="pointer-events-none fixed bottom-4 right-4 z-50 rounded border border-neutral-300 bg-white px-3 py-1.5 font-sans text-xs text-neutral-600 shadow">
        {words.pending}
      </div>
    );
  }
  const text = status === "saving" ? words.saving : status === "saved" ? words.saved : words.failed;
  return (
    <div
      role={status === "error" ? "alert" : "status"}
      className={`fixed bottom-4 right-4 z-50 flex items-center gap-3 rounded px-4 py-2 font-sans text-sm shadow-lg ${
        status === "error" ? "bg-red-700 text-white" : "bg-neutral-900 text-white"
      }`}
    >
      {text}
      {status === "error" && (
        <button type="button" onClick={onDismiss} className="text-white/80 hover:text-white" aria-label="Dismiss">
          ×
        </button>
      )}
    </div>
  );
}
