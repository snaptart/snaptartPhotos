import { Extension } from "@tiptap/core";
import { TEXT_STYLE_KEYS, type TextStyleKey } from "@/lib/theme/types";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    blockTextStyle: {
      /** Give the selected paragraphs and headings a theme text style; null goes back to the default. */
      setBlockTextStyle: (style: TextStyleKey | null) => ReturnType;
    };
  }
}

const TYPES = ["paragraph", "heading"];

/**
 * A theme text style on a whole paragraph or heading, stored as
 * `data-text-style="lead"`. The look comes from the rich-text CSS
 * (rich-text-css.ts), so it follows the active theme. Without one, a paragraph
 * reads as Body and headings as Display / Collection title / Photo title.
 */
export const BlockTextStyle = Extension.create({
  name: "blockTextStyle",

  addGlobalAttributes() {
    return [
      {
        types: TYPES,
        attributes: {
          textStyle: {
            default: null,
            parseHTML: (element) => {
              const v = element.getAttribute("data-text-style");
              return v && (TEXT_STYLE_KEYS as string[]).includes(v) ? v : null;
            },
            renderHTML: (attributes) =>
              attributes.textStyle ? { "data-text-style": attributes.textStyle } : {},
          },
        },
      },
    ];
  },

  addCommands() {
    return {
      setBlockTextStyle:
        (style) =>
        ({ tr, state, dispatch }) => {
          const { from, to } = state.selection;
          let applied = false;
          state.doc.nodesBetween(from, to, (node, pos) => {
            if (!TYPES.includes(node.type.name)) return;
            if (dispatch) tr.setNodeMarkup(pos, undefined, { ...node.attrs, textStyle: style });
            applied = true;
          });
          return applied;
        },
    };
  },
});
