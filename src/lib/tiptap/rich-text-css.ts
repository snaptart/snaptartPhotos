import { TEXT_STYLE_KEYS, type TextStyleKey } from "@/lib/theme/types";
import { TEXT_STYLE_SLUGS } from "@/lib/theme/role-style";

/**
 * How rich text looks, from the theme's text styles: paragraphs read as Body,
 * H1–H3 as Display, Collection title and Photo title, and any paragraph or
 * heading given its own style (`data-text-style`, see block-text-style.ts)
 * takes that one. Words the editor set a font, size or colour on carry those
 * as inline styles, which win over all of this.
 *
 * `maxSize` caps the type size — the editor sits in a narrow panel, where a
 * 54px Display line would leave room for two words.
 */

const HEADING_STYLES: Record<string, TextStyleKey> = { h1: "display", h2: "collectionTitle", h3: "photoTitle" };

function styleRules(key: TextStyleKey, maxSize?: number): string {
  const s = TEXT_STYLE_SLUGS[key];
  const size = `var(--theme-text-${s}-size)`;
  return `font-family: var(--theme-text-${s}-family);
  font-size: ${maxSize ? `min(${size}, ${maxSize}px)` : size};
  line-height: var(--theme-text-${s}-line-height);
  font-weight: var(--theme-text-${s}-weight);
  font-style: var(--theme-text-${s}-style);
  text-transform: var(--theme-text-${s}-transform);
  letter-spacing: var(--theme-text-${s}-tracking);
  color: var(--theme-text-${s}-color);`;
}

export function richTextCss(scope: string, { maxSize }: { maxSize?: number } = {}): string {
  const headings = Object.entries(HEADING_STYLES)
    .map(([tag, key]) => `${scope} ${tag} {\n  ${styleRules(key, maxSize)}\n  margin: 0.75em 0 0.25em;\n}`)
    .join("\n");
  // An attribute selector outranks `scope p` / `scope h1`, so a chosen style wins.
  const chosen = TEXT_STYLE_KEYS.map(
    (key) => `${scope} [data-text-style="${key}"] {\n  ${styleRules(key, maxSize)}\n}`
  ).join("\n");

  return `${scope} {
  ${styleRules("body", maxSize)}
}
${scope} p {
  ${styleRules("body", maxSize)}
  margin: 0.125em 0;
}
${headings}
${chosen}
${scope} blockquote { border-left: 3px solid var(--theme-color-rule, #d4d4d4); padding-left: 1em; margin: 0.5em 0; }
${scope} blockquote, ${scope} blockquote p { font-style: italic; }
${scope} ul, ${scope} ol { padding-left: 1.5em; margin: 0.25em 0; }
${scope} ul { list-style: disc; }
${scope} ol { list-style: decimal; }
${scope} a { text-decoration: underline; }
${scope} hr { border: 0; border-top: 1px solid var(--theme-color-rule, #d4d4d4); margin: 1em 0; }
${scope} img { max-width: 100%; height: auto; }`;
}
