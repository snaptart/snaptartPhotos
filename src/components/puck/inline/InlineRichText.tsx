"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { EditorContent, useEditor, type JSONContent } from "@tiptap/react";
import { MenuBar } from "@/components/admin/TiptapEditor";
import { richTextExtensions } from "@/lib/tiptap/extensions";
import { useCuratedFonts } from "@/lib/theme/use-curated-fonts";
import { cn } from "@/lib/utils";
import { useBlockWriter, useCanvasEditable } from "./Editable";

const EMPTY: JSONContent = { type: "doc", content: [{ type: "paragraph" }] };

/** Room the toolbar needs above the text before it drops below instead. */
const TOOLBAR_ROOM = 150;

/**
 * The Rich Text block typed into on the canvas: the same text in its real
 * styles, with the side panel's toolbar floating over it while it has focus.
 */
export function InlineRichText({ path, content, className }: { path: string; content: JSONContent | null; className?: string }) {
  useCuratedFonts();
  const [wrap, setWrap] = useState<HTMLDivElement | null>(null);
  const [focused, setFocused] = useState(false);
  const [below, setBelow] = useState(false);
  const typed = useRef<JSONContent | null>(null);
  const { write, select } = useBlockWriter();
  const handlers = useCanvasEditable(wrap, select);

  const editor = useEditor({
    extensions: richTextExtensions({ editing: true }),
    immediatelyRender: false,
    shouldRerenderOnTransaction: true,
    content: content ?? EMPTY,
    onUpdate: ({ editor }) => {
      typed.current = editor.getJSON();
      write(path, typed.current);
    },
  });

  // Changes from elsewhere (the side panel, undo) replace what's shown.
  useEffect(() => {
    if (!editor || content === typed.current) return;
    typed.current = null;
    const next = content ?? EMPTY;
    if (JSON.stringify(next) !== JSON.stringify(editor.getJSON())) editor.commands.setContent(next, { emitUpdate: false });
  }, [editor, content]);

  // The toolbar floats above the text, or below it near the top of the page,
  // at its real size however far the canvas is zoomed out.
  const [scale, setScale] = useState(1);
  useLayoutEffect(() => {
    if (!focused || !wrap) return;
    setBelow(wrap.getBoundingClientRect().top < TOOLBAR_ROOM);
    const frame = wrap.ownerDocument.defaultView?.frameElement as HTMLElement | null | undefined;
    setScale(frame?.offsetWidth ? frame.getBoundingClientRect().width / frame.offsetWidth : 1);
  }, [focused, wrap]);

  return (
    <div
      ref={setWrap}
      className="relative"
      onFocus={() => setFocused(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setFocused(false);
      }}
      onClick={handlers.onClick}
      onKeyDown={(e) => {
        handlers.onKeyDown(e);
        if (e.key === "Escape") editor?.commands.blur();
      }}
      onKeyUp={handlers.onKeyUp}
    >
      {editor && focused && (
        <div
          className={cn(
            "absolute left-0 z-50 w-[28rem] max-w-full overflow-visible rounded-md border border-admin-border-strong bg-admin-surface font-sans shadow-lg",
            below ? "top-full mt-2" : "bottom-full mb-2",
          )}
          style={{ zoom: 1 / scale }}
          // A press on the toolbar keeps the cursor in the text.
          onMouseDown={(e) => {
            if (!(e.target as HTMLElement).closest("select, input")) e.preventDefault();
          }}
        >
          <MenuBar editor={editor} />
        </div>
      )}
      <EditorContent
        editor={editor}
        className={cn(
          className,
          "cursor-text [&_.ProseMirror]:outline-none",
          "[&_.ProseMirror>p:only-child:has(>br.ProseMirror-trailingBreak:only-child)]:before:text-neutral-400 [&_.ProseMirror>p:only-child:has(>br.ProseMirror-trailingBreak:only-child)]:before:content-['Start_typing…']",
        )}
      />
    </div>
  );
}
