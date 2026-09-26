import type { ComponentData, Data } from "@puckeditor/core";
import { eachBlock } from "./data-tree";

/**
 * Site-wide defaults for block settings ("stamp" model): a new block starts with them;
 * blocks already on pages keep what they have until "Apply to existing blocks" is used.
 * Stored in the active theme preset as `blockDefaults` (only values that differ from the
 * built-in defaults) and `blockDefaultsPast` (earlier defaults, so "blocks nobody tuned by
 * hand" can still be found after the default has changed more than once).
 */

export type BlockDefaults = Record<string, Record<string, unknown>>;
export type BlockDefaultsPast = Record<string, Record<string, unknown[]>>;

export const DEFAULTS_GROUPS: { title: string; types: string[] }[] = [
  {
    title: "Page sections",
    types: ["PageIntro", "SectionHeader", "Details", "PhotoPlate", "SelectedWork", "Breadcrumb", "NextCollection"],
  },
  { title: "Layout", types: ["Columns", "Rows", "Spacer", "Container"] },
];

export const DEFAULTS_TYPES = DEFAULTS_GROUPS.flatMap((g) => g.types);

/** A block's own content — its words, photos and links — never has a site default. */
const CONTENT_PROPS: Record<string, string[]> = {
  PageIntro: ["eyebrow", "title", "text", "linkLabel", "link", "stats"],
  SectionHeader: ["title", "linkLabel", "link"],
  Details: ["items"],
  PhotoPlate: ["photo", "title", "meta", "link"],
  SelectedWork: ["photos"],
  Breadcrumb: ["items", "current"],
  NextCollection: ["gallerySlug"],
};

/** Per-block by nature: which screens a block shows on. */
const PER_BLOCK = ["id", "hideOn"];

export function isDefaultable(type: string, prop: string): boolean {
  return DEFAULTS_TYPES.includes(type) && !PER_BLOCK.includes(prop) && !(CONTENT_PROPS[type] ?? []).includes(prop);
}

/** Deep equality for prop values (text styles etc. are small objects); key order doesn't matter. */
export function sameValue(a: unknown, b: unknown): boolean {
  return stable(a) === stable(b);
}

function stable(v: unknown): string {
  if (v === undefined) return "undefined";
  if (v === null || typeof v !== "object") return JSON.stringify(v);
  if (Array.isArray(v)) return `[${v.map(stable).join(",")}]`;
  const o = v as Record<string, unknown>;
  return `{${Object.keys(o)
    .filter((k) => o[k] !== undefined)
    .sort()
    .map((k) => `${JSON.stringify(k)}:${stable(o[k])}`)
    .join(",")}}`;
}

/** Keeps only defaultable props that differ from the built-in defaults. */
export function diffFromBuiltIn(
  type: string,
  props: Record<string, unknown>,
  builtIn: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(props)) {
    if (isDefaultable(type, k) && v !== undefined && !sameValue(v, builtIn[k])) out[k] = v;
  }
  return out;
}

/**
 * After a save: every default that changed has its previous value remembered,
 * so blocks still set to it count as "not tuned by hand".
 */
export function nextPast(prev: BlockDefaults, next: BlockDefaults, past: BlockDefaultsPast): BlockDefaultsPast {
  const out: BlockDefaultsPast = structuredClone(past ?? {});
  for (const type of Object.keys(prev ?? {})) {
    for (const [prop, old] of Object.entries(prev[type] ?? {})) {
      if (sameValue(old, next[type]?.[prop])) continue;
      const list = ((out[type] ??= {})[prop] ??= []);
      if (!list.some((v) => sameValue(v, old))) list.push(old);
      if (list.length > 10) list.shift();
    }
  }
  return out;
}

export type ApplyMode = "untouched" | "all";

export type ApplyRequest = {
  type: string;
  /** Prop → the value to set. */
  values: Record<string, unknown>;
  /** "untouched": only blocks whose setting is still a built-in or earlier default. */
  mode: ApplyMode;
  /** Built-in default for each prop in `values` (the client has the Puck config). */
  builtIn: Record<string, unknown>;
  /** Earlier defaults per prop (from the theme). */
  past?: Record<string, unknown[]>;
};

/** Which of the request's props this block would change. */
export function propsToChange(block: ComponentData, req: ApplyRequest): string[] {
  if (block.type !== req.type) return [];
  const props = block.props as Record<string, unknown>;
  return Object.entries(req.values)
    .filter(([prop, value]) => {
      if (!isDefaultable(req.type, prop)) return false;
      const current = props[prop];
      if (sameValue(current, value)) return false;
      if (req.mode === "all") return true;
      return (
        current === undefined ||
        sameValue(current, req.builtIn[prop]) ||
        (req.past?.[prop] ?? []).some((old) => sameValue(current, old))
      );
    })
    .map(([prop]) => prop);
}

/** Counts (and, with `write`, makes) the changes on one page. Returns the new data when anything changed. */
export function applyToPage(data: Data, req: ApplyRequest): { blocks: number; data: Data | null } {
  const next = structuredClone(data);
  let blocks = 0;
  eachBlock(next, (block) => {
    const props = propsToChange(block, req);
    if (!props.length) return;
    blocks++;
    for (const p of props) (block.props as Record<string, unknown>)[p] = structuredClone(req.values[p]);
  });
  return { blocks, data: blocks ? next : null };
}
