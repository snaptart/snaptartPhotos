import { getSchema } from "@tiptap/core";
import { Node as PMNode, type DOMOutputSpec, type Schema } from "@tiptap/pm/model";
import type { JSONContent } from "@tiptap/core";
import { richTextExtensions } from "./extensions";

/**
 * Saved rich text → HTML, as a plain string walk over the schema's own
 * `toDOM` specs — no DOM involved.
 *
 * `@tiptap/html` serialises through a real DOM in the browser and through
 * happy-dom on the server, and the two disagree (the browser rewrites
 * `color: #878787` to `rgb(135, 135, 135)`, the server adds `xmlns`), so a
 * server-rendered Rich Text block never matched what React hydrated.
 * Building the string by hand gives the same output in both places.
 */

const VOID_TAGS = new Set(["area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "source", "track", "wbr"]);

let schema: Schema | null = null;
function richTextSchema(): Schema {
  schema ??= getSchema(richTextExtensions());
  return schema;
}

function escapeText(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function attributes(attrs: Record<string, unknown>): string {
  let out = "";
  for (const [name, value] of Object.entries(attrs)) {
    if (value == null || value === false) continue;
    out += value === true ? ` ${name}` : ` ${name}="${escapeText(String(value)).replace(/"/g, "&quot;")}"`;
  }
  return out;
}

/** A DOMOutputSpec as HTML, with `hole` where the spec marks its content (0). */
function renderSpec(spec: DOMOutputSpec, hole: string): string {
  if (typeof spec === "string") return escapeText(spec);
  if (!Array.isArray(spec)) throw new Error("Rich text: unsupported DOM output spec");
  const [rawTag, ...rest] = spec as readonly unknown[];
  // "ns tag" names a namespace; HTML output only needs the tag.
  const tag = String(rawTag).split(" ").pop()!;
  let attrs = "";
  let i = 0;
  const first = rest[0];
  if (first && typeof first === "object" && !Array.isArray(first)) {
    attrs = attributes(first as Record<string, unknown>);
    i = 1;
  }
  let inner = "";
  for (; i < rest.length; i++) {
    inner += rest[i] === 0 ? hole : renderSpec(rest[i] as DOMOutputSpec, hole);
  }
  return VOID_TAGS.has(tag) ? `<${tag}${attrs}>` : `<${tag}${attrs}>${inner}</${tag}>`;
}

function renderNode(node: PMNode): string {
  if (node.isText) {
    // Marks are ordered outermost first; wrap from the inside out.
    let html = escapeText(node.text ?? "");
    for (let m = node.marks.length - 1; m >= 0; m--) {
      const mark = node.marks[m];
      const toDOM = mark.type.spec.toDOM;
      if (toDOM) html = renderSpec(toDOM(mark, true), html);
    }
    return html;
  }
  let content = "";
  node.forEach((child) => {
    content += renderNode(child);
  });
  const toDOM = node.type.spec.toDOM;
  return toDOM ? renderSpec(toDOM(node), content) : content;
}

/** HTML for a saved rich-text document; "" when there's nothing or it can't be read. */
export function renderRichText(content: JSONContent | null | undefined): string {
  if (!content) return "";
  try {
    const doc = PMNode.fromJSON(richTextSchema(), content);
    const html = renderNode(doc);
    // An empty paragraph is a deliberate blank line; give it height.
    return html.replace(/<p([^>]*)><\/p>/g, "<p$1><br></p>");
  } catch {
    return "";
  }
}
