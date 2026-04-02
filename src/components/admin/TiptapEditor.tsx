"use client";

import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import TextAlign from "@tiptap/extension-text-align";
import Underline from "@tiptap/extension-underline";
import { TextStyle } from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import FontFamily from "@tiptap/extension-font-family";
import { FontSize } from "@/lib/tiptap/font-size";
import { Indent } from "@/lib/tiptap/indent";
import type { JSONContent } from "@tiptap/react";

const FONT_FAMILIES = [
  { label: "Default", value: "" },
  { label: "EB Garamond", value: "EB Garamond" },
  { label: "Inter", value: "Inter" },
  { label: "Georgia", value: "Georgia" },
  { label: "Times New Roman", value: "Times New Roman" },
  { label: "Arial", value: "Arial" },
  { label: "Verdana", value: "Verdana" },
  { label: "Courier New", value: "Courier New" },
];

const FONT_SIZES = [
  { label: "Default", value: "" },
  { label: "12px", value: "12px" },
  { label: "14px", value: "14px" },
  { label: "16px", value: "16px" },
  { label: "18px", value: "18px" },
  { label: "20px", value: "20px" },
  { label: "24px", value: "24px" },
  { label: "28px", value: "28px" },
  { label: "32px", value: "32px" },
  { label: "36px", value: "36px" },
  { label: "48px", value: "48px" },
];

interface TiptapEditorProps {
  content: JSONContent | null;
  onChange: (content: JSONContent) => void;
}

function MenuBar({ editor }: { editor: Editor | null }) {
  if (!editor) return null;

  const btnClass = (active: boolean) =>
    `rounded px-2 py-1 text-sm ${
      active
        ? "bg-neutral-900 text-white"
        : "bg-neutral-100 text-neutral-700 hover:bg-neutral-200"
    }`;

  return (
    <div className="flex flex-wrap gap-1 border-b border-neutral-200 bg-neutral-50 p-2">
      <button type="button" onClick={() => editor.chain().focus().toggleBold().run()} className={btnClass(editor.isActive("bold"))}>
        B
      </button>
      <button type="button" onClick={() => editor.chain().focus().toggleItalic().run()} className={btnClass(editor.isActive("italic"))}>
        I
      </button>
      <button type="button" onClick={() => editor.chain().focus().toggleUnderline().run()} className={btnClass(editor.isActive("underline"))}>
        U
      </button>
      <button type="button" onClick={() => editor.chain().focus().toggleStrike().run()} className={btnClass(editor.isActive("strike"))}>
        S
      </button>

      <span className="mx-1 border-l border-neutral-300" />

      <select
        value={editor.getAttributes("textStyle").fontFamily || ""}
        onChange={(e) => {
          if (e.target.value) {
            editor.chain().focus().setFontFamily(e.target.value).run();
          } else {
            editor.chain().focus().unsetFontFamily().run();
          }
        }}
        className="rounded border border-neutral-300 bg-white px-1.5 py-1 text-sm text-neutral-700"
      >
        {FONT_FAMILIES.map((f) => (
          <option key={f.value} value={f.value}>
            {f.label}
          </option>
        ))}
      </select>

      <select
        value={editor.getAttributes("textStyle").fontSize || ""}
        onChange={(e) => {
          if (e.target.value) {
            editor.chain().focus().setFontSize(e.target.value).run();
          } else {
            editor.chain().focus().unsetFontSize().run();
          }
        }}
        className="rounded border border-neutral-300 bg-white px-1.5 py-1 text-sm text-neutral-700"
      >
        {FONT_SIZES.map((s) => (
          <option key={s.value} value={s.value}>
            {s.label}
          </option>
        ))}
      </select>

      <label className="relative flex items-center gap-1 rounded px-1.5 py-1 text-sm bg-neutral-100 text-neutral-700 hover:bg-neutral-200 cursor-pointer">
        <span
          className="inline-block h-4 w-4 rounded border border-neutral-300"
          style={{ backgroundColor: editor.getAttributes("textStyle").color || "#000000" }}
        />
        A
        <input
          type="color"
          value={editor.getAttributes("textStyle").color || "#000000"}
          onChange={(e) => editor.chain().focus().setColor(e.target.value).run()}
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
        />
      </label>
      <button
        type="button"
        onClick={() => editor.chain().focus().unsetColor().run()}
        className={btnClass(false)}
        title="Reset color"
      >
        ✕
      </button>

      <span className="mx-1 border-l border-neutral-300" />

      <button type="button" onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} className={btnClass(editor.isActive("heading", { level: 1 }))}>
        H1
      </button>
      <button type="button" onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} className={btnClass(editor.isActive("heading", { level: 2 }))}>
        H2
      </button>
      <button type="button" onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} className={btnClass(editor.isActive("heading", { level: 3 }))}>
        H3
      </button>

      <span className="mx-1 border-l border-neutral-300" />

      <button type="button" onClick={() => editor.chain().focus().setTextAlign("left").run()} className={btnClass(editor.isActive({ textAlign: "left" }))}>
        Left
      </button>
      <button type="button" onClick={() => editor.chain().focus().setTextAlign("center").run()} className={btnClass(editor.isActive({ textAlign: "center" }))}>
        Center
      </button>
      <button type="button" onClick={() => editor.chain().focus().setTextAlign("right").run()} className={btnClass(editor.isActive({ textAlign: "right" }))}>
        Right
      </button>
      <button type="button" onClick={() => editor.chain().focus().setTextAlign("justify").run()} className={btnClass(editor.isActive({ textAlign: "justify" }))}>
        Justify
      </button>

      <span className="mx-1 border-l border-neutral-300" />

      <button type="button" onClick={() => editor.chain().focus().toggleBulletList().run()} className={btnClass(editor.isActive("bulletList"))}>
        List
      </button>
      <button type="button" onClick={() => editor.chain().focus().toggleOrderedList().run()} className={btnClass(editor.isActive("orderedList"))}>
        Ordered
      </button>
      <button type="button" onClick={() => editor.chain().focus().toggleBlockquote().run()} className={btnClass(editor.isActive("blockquote"))}>
        Quote
      </button>

      <span className="mx-1 border-l border-neutral-300" />

      <button
        type="button"
        onClick={() => {
          const url = window.prompt("Link URL:");
          if (url) editor.chain().focus().setLink({ href: url }).run();
        }}
        className={btnClass(editor.isActive("link"))}
      >
        Link
      </button>
      <button
        type="button"
        onClick={() => {
          const url = window.prompt("Image URL:");
          if (url) editor.chain().focus().setImage({ src: url }).run();
        }}
        className={btnClass(false)}
      >
        Image
      </button>

      <span className="mx-1 border-l border-neutral-300" />

      <button type="button" onClick={() => editor.chain().focus().indent().run()} className={btnClass(false)}>
        Indent
      </button>
      <button type="button" onClick={() => editor.chain().focus().outdent().run()} className={btnClass(false)}>
        Outdent
      </button>
      <button type="button" onClick={() => editor.chain().focus().toggleFirstLineIndent().run()} className={btnClass(editor.isActive({ firstLineIndent: true }))}>
        ¶ Indent
      </button>

      <span className="mx-1 border-l border-neutral-300" />

      <button type="button" onClick={() => editor.chain().focus().setHorizontalRule().run()} className={btnClass(false)}>
        HR
      </button>
      <button type="button" onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()} className={`${btnClass(false)} disabled:opacity-30`}>
        Undo
      </button>
      <button type="button" onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()} className={`${btnClass(false)} disabled:opacity-30`}>
        Redo
      </button>
    </div>
  );
}

export default function TiptapEditor({ content, onChange }: TiptapEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      TextStyle,
      Color,
      FontFamily,
      FontSize,
      Image,
      Link.configure({ openOnClick: false }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Indent,
    ],
    immediatelyRender: false,
    content: content ?? { type: "doc", content: [{ type: "paragraph" }] },
    onUpdate: ({ editor }) => {
      onChange(editor.getJSON());
    },
  });

  return (
    <div className="rounded border border-neutral-300 overflow-hidden">
      <MenuBar editor={editor} />
      <EditorContent
        editor={editor}
        className="prose prose-sm prose-p:my-1 prose-headings:my-2 max-w-none p-4 min-h-[200px] focus:outline-none [&_.ProseMirror]:min-h-[200px] [&_.ProseMirror]:outline-none"
      />
    </div>
  );
}
