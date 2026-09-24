"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
} from "react";
import { registerOverlayPortal, setDeep, useGetPuck } from "@puckeditor/core";

/**
 * Click-to-edit on the editor canvas. Every block renders inside an
 * InlineEditScope carrying its id; an <Editable> inside it becomes typeable
 * text in the editor and plain text everywhere else.
 */

const EditScope = createContext<string | null>(null);

export function InlineEditScope({ id, editing, children }: { id?: string; editing?: boolean; children: ReactNode }) {
  if (!editing || !id) return <>{children}</>;
  return <EditScope.Provider value={id}>{children}</EditScope.Provider>;
}

/** True inside a block on the editor canvas. */
export function useInlineEditing() {
  return useContext(EditScope) !== null;
}

/** Writes one prop of the block being edited (a dotted path, e.g. `items[2].term`), and selects it. */
export function useBlockWriter() {
  const id = useContext(EditScope);
  const getPuck = useGetPuck();

  const write = useCallback(
    (path: string, value: unknown) => {
      if (!id) return;
      const puck = getPuck();
      const item = puck.getItemById(id);
      const selector = puck.getSelectorForId(id);
      if (!item || !selector) return;
      puck.dispatch({
        type: "replace",
        data: { ...item, props: setDeep(item.props, path, value) },
        destinationIndex: selector.index,
        destinationZone: selector.zone,
      });
    },
    [getPuck, id],
  );

  const select = useCallback(() => {
    if (!id) return;
    const puck = getPuck();
    const selector = puck.getSelectorForId(id);
    if (selector) puck.dispatch({ type: "setUi", ui: { itemSelector: selector } });
  }, [getPuck, id]);

  return { write, select };
}

/**
 * Lets the canvas take pointer events inside `el` (Puck otherwise switches
 * them off within blocks), and stops a press there starting a drag once it
 * has focus. Returns handlers for the element: a click selects the block —
 * Puck's own click handler, which runs first, would toggle it — and keys stay
 * out of Puck's shortcuts.
 */
export function useCanvasEditable(el: HTMLElement | null, select: () => void) {
  useEffect(() => {
    if (!el) return;
    return registerOverlayPortal(el, { disableDragOnFocus: true });
  }, [el]);

  return {
    onClick: (e: MouseEvent) => {
      // The canvas further up would clear the selection again.
      e.stopPropagation();
      select();
    },
    onKeyDown: (e: KeyboardEvent) => e.stopPropagation(),
    onKeyUp: (e: KeyboardEvent) => e.stopPropagation(),
  };
}

/**
 * The text as typed. Not `innerText`, which gives it as displayed — a label
 * style's capitals would be saved as capitals.
 */
function readText(el: HTMLElement): string {
  let out = "";
  el.childNodes.forEach((node) => {
    if (node.nodeType === Node.TEXT_NODE) out += node.nodeValue ?? "";
    else if (node.nodeName === "BR") out += "\n";
    else if (node instanceof HTMLElement) out += (out && !out.endsWith("\n") ? "\n" : "") + readText(node);
  });
  return out;
}

function placeCaretAtEnd(el: HTMLElement) {
  const selection = el.ownerDocument.getSelection();
  if (!selection) return;
  const range = el.ownerDocument.createRange();
  range.selectNodeContents(el);
  range.collapse(false);
  selection.removeAllRanges();
  selection.addRange(range);
}

type EditableProps = {
  /** Where the text is stored on the block, e.g. `title` or `items[0].term`. */
  path: string;
  value: string | undefined;
  /** Shown when the text is blank — on the site too (e.g. the photo's own title). */
  fallback?: string;
  /** Shown only in the editor while the text is blank. */
  placeholder?: string;
  /** Allow line breaks (Enter). */
  multiline?: boolean;
  /** Turns the typed text into what's stored, when this piece is part of a larger value. */
  compose?: (text: string) => string;
};

/**
 * Text that can be typed into on the canvas. Elsewhere it's just the text
 * (or the fallback).
 */
export function Editable(props: EditableProps) {
  const editing = useInlineEditing();
  if (!editing) return <>{props.value || props.fallback || ""}</>;
  return <EditableText {...props} />;
}

function EditableText({ path, value, fallback, placeholder, multiline, compose }: EditableProps) {
  const [el, setEl] = useState<HTMLSpanElement | null>(null);
  const [active, setActive] = useState(false);
  const typed = useRef<string | null>(null);
  const { write, select } = useBlockWriter();
  const handlers = useCanvasEditable(el, select);

  const text = value ?? "";

  // React never renders the span's children: the browser owns them while you
  // type. They're brought in line with the stored text when it changes from
  // elsewhere (the side panel, undo).
  useLayoutEffect(() => {
    if (!el) return;
    if (typed.current === text) return;
    typed.current = null;
    if (readText(el) !== text) el.textContent = text;
  }, [el, text]);

  const onInput = () => {
    if (!el) return;
    let next = readText(el);
    // An emptied element keeps a stray line break.
    if (next === "\n") next = "";
    if (!multiline) next = next.replace(/\n/g, " ");
    typed.current = next;
    write(path, compose ? compose(next) : next);
  };

  return (
    <span
      ref={setEl}
      data-inline-edit=""
      data-placeholder={fallback || placeholder || "Type here"}
      data-fallback={fallback ? "" : undefined}
      style={multiline ? { whiteSpace: "pre-line" } : undefined}
      // Typeable only under the pointer or while focused, so a press elsewhere
      // on the block still drags it.
      contentEditable={active ? "plaintext-only" : "false"}
      suppressContentEditableWarning
      spellCheck={active}
      onPointerEnter={() => setActive(true)}
      onPointerLeave={(e) => {
        if (e.currentTarget.ownerDocument.activeElement !== e.currentTarget) setActive(false);
      }}
      onFocus={(e) => {
        setActive(true);
        // Start from the text shown, so it can be adjusted rather than retyped.
        if (!text && fallback) {
          e.currentTarget.textContent = fallback;
          placeCaretAtEnd(e.currentTarget);
        }
      }}
      onBlur={(e) => {
        setActive(false);
        // Left as it was: keep following the fallback.
        if (!text && readText(e.currentTarget) === fallback) e.currentTarget.textContent = "";
      }}
      onClick={(e) => {
        // Inside a link, a click places the cursor rather than following it.
        e.preventDefault();
        handlers.onClick(e);
      }}
      onKeyUp={handlers.onKeyUp}
      onKeyDown={(e) => {
        handlers.onKeyDown(e);
        if (e.key === "Escape") e.currentTarget.blur();
        if (e.key === "Enter" && !multiline) {
          e.preventDefault();
          e.currentTarget.blur();
        }
      }}
      onInput={onInput}
    />
  );
}
