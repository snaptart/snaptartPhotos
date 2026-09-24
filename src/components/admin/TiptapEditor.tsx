"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import type { JSONContent } from "@tiptap/react";
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  Image as ImageIcon,
  IndentDecrease,
  IndentIncrease,
  Italic,
  Link as LinkIcon,
  List,
  ListOrdered,
  Minus,
  Pilcrow,
  Quote,
  Redo2,
  Strikethrough,
  Underline as UnderlineIcon,
  Undo2,
} from "lucide-react";
import { CURATED_FONTS, FONT_GROUPS, getFontFallback, leadingFontFamily } from "@/lib/theme/fonts";
import { useCuratedFonts } from "@/lib/theme/use-curated-fonts";
import { useActiveTheme } from "@/lib/theme/use-active-theme";
import {
  COLOR_TOKENS,
  ROLE_FAMILY_FIELDS,
  ROLE_LABELS,
  TEXT_STYLE_KEYS,
  TEXT_STYLE_LABELS,
  type FontRoleKey,
  type TextStyleKey,
} from "@/lib/theme/types";
import { ROLE_SLUGS } from "@/lib/theme/role-style";
import { colorTokenOf, cssColor, isHexColor, tokenColor } from "@/lib/theme/color";
import { richTextExtensions } from "@/lib/tiptap/extensions";
import { richTextCss } from "@/lib/tiptap/rich-text-css";
import { ColorControl } from "@/components/admin/controls";
import { cn } from "@/lib/utils";

/** Installed on every visitor's machine, so they need no web-font loading. */
const SYSTEM_FONTS = ["Georgia", "Times New Roman", "Arial", "Verdana", "Courier New"];

const CURATED_NAMES = new Set(CURATED_FONTS.map((f) => f.name));

/** Theme fonts offered first; picking one stores the role's variable, so it follows the preset. */
const THEME_FONT_ROLES: FontRoleKey[] = ["headings", "body", "captions", "labels"];
const roleFontVar = (role: FontRoleKey) => `var(--theme-font-${ROLE_SLUGS[role]}-family)`;

const FONT_SIZES = ["12px", "14px", "16px", "18px", "20px", "24px", "28px", "32px", "36px", "48px"];

/** What a paragraph or heading looks like before a style is picked for it. */
const DEFAULT_STYLE: Record<string, TextStyleKey> = {
  paragraph: "body",
  h1: "display",
  h2: "collectionTitle",
  h3: "photoTitle",
};

// The editor shows text in its real styles, capped so a Display line still fits the panel.
const EDITOR_CSS = richTextCss(".richtext-editor .ProseMirror", { maxSize: 30 });

const SELECT =
  "min-w-0 rounded-md border border-admin-border-strong bg-admin-surface px-2 py-1 text-[12px] text-admin-ink focus:border-admin-accent focus:outline-none";

interface TiptapEditorProps {
  content: JSONContent | null;
  onChange: (content: JSONContent) => void;
}

function ToolButton({
  active = false,
  disabled = false,
  title,
  onClick,
  children,
}: {
  active?: boolean;
  disabled?: boolean;
  title: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      aria-pressed={active}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "flex h-7 min-w-7 items-center justify-center rounded px-1.5 text-[12px] font-medium transition-colors disabled:opacity-30",
        active ? "bg-admin-ink text-admin-surface" : "text-admin-ink-soft hover:bg-admin-surface-2 hover:text-admin-ink",
      )}
    >
      {children}
    </button>
  );
}

const Divider = () => <span className="mx-0.5 h-5 w-px self-center bg-admin-border" />;

/** The stored colour as the colour control's value: a theme variable back to its token. */
function colorControlValue(stored: string | undefined): string {
  if (!stored) return "";
  const token = COLOR_TOKENS.find((t) => stored.replace(/\s/g, "") === `var(${t.cssVar})`);
  return token ? tokenColor(token.key) : stored;
}

function TextColorButton({ editor }: { editor: Editor }) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const stored: string | undefined = editor.getAttributes("textStyle").color;

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  const apply = (v: string) => {
    setDraft(v);
    if (v === "") editor.chain().focus().unsetColor().run();
    // Typed hex applies once it's a whole colour.
    else if (colorTokenOf(v) || isHexColor(v)) editor.chain().focus().setColor(cssColor(v)).run();
  };

  // Not `relative`: the popover hangs from the toolbar, so it spans the panel's width.
  return (
    <div ref={ref}>
      <ToolButton
        title="Text color"
        active={open}
        onClick={() => {
          setDraft(null);
          setOpen((o) => !o);
        }}
      >
        <span className="flex flex-col items-center leading-none">
          <span className="text-[13px] font-semibold">A</span>
          <span
            className="mt-0.5 h-1 w-4 rounded-sm border border-admin-border"
            style={{ background: stored ?? "transparent" }}
          />
        </span>
      </ToolButton>
      {open && (
        <div className="absolute inset-x-2 top-full z-20 -mt-1 rounded-md border border-admin-border bg-admin-surface p-3 shadow-lg">
          <ColorControl value={draft ?? colorControlValue(stored)} onChange={apply} emptyLabel="Text style's color" />
        </div>
      )}
    </div>
  );
}

export function MenuBar({ editor }: { editor: Editor }) {
  const theme = useActiveTheme();

  // The block the cursor is in, and the style it has (or would have by default).
  const headingLevel = ([1, 2, 3] as const).find((level) => editor.isActive("heading", { level }));
  const blockKind = headingLevel ? `h${headingLevel}` : "paragraph";
  const chosenStyle: TextStyleKey | null =
    (headingLevel ? editor.getAttributes("heading").textStyle : editor.getAttributes("paragraph").textStyle) ?? null;

  const storedFont: string | undefined = editor.getAttributes("textStyle").fontFamily;
  const fontRole = THEME_FONT_ROLES.find((r) => storedFont?.replace(/\s/g, "") === roleFontVar(r));
  const currentFont = fontRole ? `role:${fontRole}` : storedFont ? leadingFontFamily(storedFont) : "";
  const currentSize: string = editor.getAttributes("textStyle").fontSize || "";

  return (
    <div className="relative flex flex-col gap-1.5 border-b border-admin-border bg-admin-surface-2 p-2">
      <select
        value={chosenStyle ?? ""}
        onChange={(e) => editor.chain().focus().setBlockTextStyle((e.target.value || null) as TextStyleKey | null).run()}
        className={cn(SELECT, "w-full text-[13px]")}
        title="Text style for this paragraph"
        aria-label="Text style"
      >
        <option value="">{TEXT_STYLE_LABELS[DEFAULT_STYLE[blockKind]]} (default)</option>
        {TEXT_STYLE_KEYS.map((key) => (
          <option key={key} value={key}>
            {TEXT_STYLE_LABELS[key]}
          </option>
        ))}
      </select>

      <div className="flex gap-1.5">
        <select
          value={currentFont}
          onChange={(e) => {
            const name = e.target.value;
            if (!name) editor.chain().focus().unsetFontFamily().run();
            else if (name.startsWith("role:")) editor.chain().focus().setFontFamily(roleFontVar(name.slice(5) as FontRoleKey)).run();
            // Store the full stack so text still lands in the right kind of face
            // if the web font ever fails to load.
            else if (CURATED_NAMES.has(name)) editor.chain().focus().setFontFamily(getFontFallback(name)).run();
            else editor.chain().focus().setFontFamily(name).run();
          }}
          className={cn(SELECT, "flex-1")}
          title="Font for the selected words"
          aria-label="Font"
        >
          <option value="">Style font</option>
          <optgroup label="Theme fonts">
            {THEME_FONT_ROLES.map((role) => (
              <option key={role} value={`role:${role}`}>
                {ROLE_LABELS[role]}
                {theme ? ` — ${theme[ROLE_FAMILY_FIELDS[role]] as string}` : ""}
              </option>
            ))}
          </optgroup>
          {FONT_GROUPS.map((group) => (
            <optgroup key={group.category} label={group.label}>
              {CURATED_FONTS.filter((f) => f.category === group.category).map((f) => (
                <option key={f.name} value={f.name} style={{ fontFamily: getFontFallback(f.name) }}>
                  {f.name}
                </option>
              ))}
            </optgroup>
          ))}
          <optgroup label="System">
            {SYSTEM_FONTS.map((name) => (
              <option key={name} value={name} style={{ fontFamily: name }}>
                {name}
              </option>
            ))}
          </optgroup>
          {currentFont && !fontRole && !CURATED_NAMES.has(currentFont) && !SYSTEM_FONTS.includes(currentFont) && (
            <option value={currentFont}>{currentFont}</option>
          )}
        </select>

        <select
          value={currentSize}
          onChange={(e) =>
            e.target.value
              ? editor.chain().focus().setFontSize(e.target.value).run()
              : editor.chain().focus().unsetFontSize().run()
          }
          className={cn(SELECT, "w-[6.25rem] shrink-0")}
          title="Size for the selected words"
          aria-label="Size"
        >
          <option value="">Style size</option>
          {FONT_SIZES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
          {currentSize && !FONT_SIZES.includes(currentSize) && <option value={currentSize}>{currentSize}</option>}
        </select>
      </div>

      <div className="flex flex-wrap items-center gap-0.5">
        <ToolButton title="Bold" active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()}>
          <Bold size={14} />
        </ToolButton>
        <ToolButton title="Italic" active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()}>
          <Italic size={14} />
        </ToolButton>
        <ToolButton title="Underline" active={editor.isActive("underline")} onClick={() => editor.chain().focus().toggleUnderline().run()}>
          <UnderlineIcon size={14} />
        </ToolButton>
        <ToolButton title="Strikethrough" active={editor.isActive("strike")} onClick={() => editor.chain().focus().toggleStrike().run()}>
          <Strikethrough size={14} />
        </ToolButton>
        <TextColorButton editor={editor} />

        <Divider />
        {([1, 2, 3] as const).map((level) => (
          <ToolButton
            key={level}
            title={`Heading ${level}`}
            active={headingLevel === level}
            onClick={() => editor.chain().focus().toggleHeading({ level }).run()}
          >
            H{level}
          </ToolButton>
        ))}

        <Divider />
        <ToolButton title="Align left" active={editor.isActive({ textAlign: "left" })} onClick={() => editor.chain().focus().setTextAlign("left").run()}>
          <AlignLeft size={14} />
        </ToolButton>
        <ToolButton title="Align center" active={editor.isActive({ textAlign: "center" })} onClick={() => editor.chain().focus().setTextAlign("center").run()}>
          <AlignCenter size={14} />
        </ToolButton>
        <ToolButton title="Align right" active={editor.isActive({ textAlign: "right" })} onClick={() => editor.chain().focus().setTextAlign("right").run()}>
          <AlignRight size={14} />
        </ToolButton>
        <ToolButton title="Justify" active={editor.isActive({ textAlign: "justify" })} onClick={() => editor.chain().focus().setTextAlign("justify").run()}>
          <AlignJustify size={14} />
        </ToolButton>

        <Divider />
        <ToolButton title="Bulleted list" active={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()}>
          <List size={14} />
        </ToolButton>
        <ToolButton title="Numbered list" active={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()}>
          <ListOrdered size={14} />
        </ToolButton>
        <ToolButton title="Quote" active={editor.isActive("blockquote")} onClick={() => editor.chain().focus().toggleBlockquote().run()}>
          <Quote size={14} />
        </ToolButton>

        <Divider />
        <ToolButton
          title="Link"
          active={editor.isActive("link")}
          onClick={() => {
            const url = window.prompt("Link URL:", editor.getAttributes("link").href ?? "");
            if (url === null) return;
            if (url === "") editor.chain().focus().unsetLink().run();
            else editor.chain().focus().setLink({ href: url }).run();
          }}
        >
          <LinkIcon size={14} />
        </ToolButton>
        <ToolButton
          title="Image"
          onClick={() => {
            const url = window.prompt("Image URL:");
            if (url) editor.chain().focus().setImage({ src: url }).run();
          }}
        >
          <ImageIcon size={14} />
        </ToolButton>

        <Divider />
        <ToolButton title="Indent" onClick={() => editor.chain().focus().indent().run()}>
          <IndentIncrease size={14} />
        </ToolButton>
        <ToolButton title="Outdent" onClick={() => editor.chain().focus().outdent().run()}>
          <IndentDecrease size={14} />
        </ToolButton>
        <ToolButton
          title="First-line indent"
          active={editor.isActive({ firstLineIndent: true })}
          onClick={() => editor.chain().focus().toggleFirstLineIndent().run()}
        >
          <Pilcrow size={14} />
        </ToolButton>
        <ToolButton title="Horizontal rule" onClick={() => editor.chain().focus().setHorizontalRule().run()}>
          <Minus size={14} />
        </ToolButton>

        <Divider />
        <ToolButton title="Undo" disabled={!editor.can().undo()} onClick={() => editor.chain().focus().undo().run()}>
          <Undo2 size={14} />
        </ToolButton>
        <ToolButton title="Redo" disabled={!editor.can().redo()} onClick={() => editor.chain().focus().redo().run()}>
          <Redo2 size={14} />
        </ToolButton>
      </div>
    </div>
  );
}

export default function TiptapEditor({ content, onChange }: TiptapEditorProps) {
  useCuratedFonts();

  const editor = useEditor({
    extensions: richTextExtensions({ editing: true }),
    immediatelyRender: false,
    // The toolbar reflects where the cursor is, so it redraws as it moves.
    shouldRerenderOnTransaction: true,
    content: content ?? { type: "doc", content: [{ type: "paragraph" }] },
    onUpdate: ({ editor }) => {
      onChange(editor.getJSON());
    },
  });

  // Text typed on the canvas arrives as a new value; take it in unless this editor is the one typing.
  useEffect(() => {
    if (!editor || editor.isFocused || !content) return;
    if (JSON.stringify(content) !== JSON.stringify(editor.getJSON())) editor.commands.setContent(content, { emitUpdate: false });
  }, [editor, content]);

  return (
    <div className="overflow-visible rounded-md border border-admin-border-strong bg-admin-surface">
      <style>{EDITOR_CSS}</style>
      {editor && <MenuBar editor={editor} />}
      <EditorContent
        editor={editor}
        className="richtext-editor min-h-[200px] px-3 py-2 [&_.ProseMirror]:min-h-[184px] [&_.ProseMirror]:outline-none"
      />
    </div>
  );
}
