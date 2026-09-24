import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import TextAlign from "@tiptap/extension-text-align";
import { TextStyle } from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import FontFamily from "@tiptap/extension-font-family";
import { FontSize } from "./font-size";
import { Indent } from "./indent";
import { BlockTextStyle } from "./block-text-style";

/**
 * The one list of rich-text extensions, for the editor and for rendering
 * saved content, so both read the same document the same way. StarterKit
 * already includes Link and Underline.
 */
export function richTextExtensions({ editing = false }: { editing?: boolean } = {}) {
  return [
    // In the editor a click puts the cursor in a link rather than following it.
    StarterKit.configure({ link: { openOnClick: !editing } }),
    TextStyle,
    Color,
    FontFamily,
    FontSize,
    Image,
    TextAlign.configure({ types: ["heading", "paragraph"] }),
    Indent,
    BlockTextStyle,
  ];
}
