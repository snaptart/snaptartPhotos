import type { ComponentData, Data } from "@puckeditor/core";

/**
 * Helpers for Puck page data as this site stores it: top-level blocks in `data.content`,
 * and blocks inside a Container/Columns/… in `data.zones["<parentId>:<zoneName>"]`
 * (DropZones, not slot fields).
 */

type Zones = Record<string, ComponentData[]>;

/** One or more blocks together with every zone nested inside them. */
export type BlockFragment = { content: ComponentData[]; zones: Zones };

export function isPuckData(value: unknown): value is Data {
  return !!value && typeof value === "object" && "root" in value && Array.isArray((value as Data).content);
}

function zonesOf(id: string, zones: Zones): string[] {
  return Object.keys(zones).filter((k) => k.slice(0, k.indexOf(":")) === id);
}

/**
 * Calls `fn` for every block on the page in reading order, nested ones included.
 * `zone` is the compound zone key, or "root:default-zone" for top-level blocks.
 */
export function eachBlock(data: Data, fn: (block: ComponentData, zone: string, index: number) => void): void {
  const zones = (data.zones ?? {}) as Zones;
  const seen = new Set<string>();
  const visit = (list: ComponentData[], zone: string) => {
    list.forEach((block, i) => {
      fn(block, zone, i);
      const id = block.props?.id as string | undefined;
      if (!id || seen.has(id)) return;
      seen.add(id);
      for (const key of zonesOf(id, zones)) visit(zones[key] ?? [], key);
    });
  };
  visit((data.content ?? []) as ComponentData[], "root:default-zone");
}

export function findBlock(data: Data, id: string): ComponentData | undefined {
  let found: ComponentData | undefined;
  eachBlock(data, (b) => {
    if (!found && b.props?.id === id) found = b;
  });
  return found;
}

/** The given blocks and everything inside them, detached from the page. */
export function extractFragment(data: Data, ids: string[]): BlockFragment {
  const zones = (data.zones ?? {}) as Zones;
  const content = ids.map((id) => findBlock(data, id)).filter((b): b is ComponentData => !!b);
  const out: Zones = {};
  const collect = (block: ComponentData) => {
    const id = block.props?.id as string;
    for (const key of zonesOf(id, zones)) {
      if (out[key]) continue;
      out[key] = zones[key] ?? [];
      out[key].forEach(collect);
    }
  };
  content.forEach(collect);
  return structuredClone({ content, zones: out });
}

/**
 * The same fragment with new block ids (Puck's "Type-uuid" form), zone keys renamed to match,
 * so it can sit next to — or on the same page as — the original.
 */
export function withFreshIds(fragment: BlockFragment, newId: (type: string) => string): BlockFragment {
  const map = new Map<string, string>();
  const rename = (block: ComponentData): ComponentData => {
    const old = block.props.id as string;
    const next = newId(block.type as string);
    map.set(old, next);
    return { ...block, props: { ...block.props, id: next } };
  };
  const content = fragment.content.map(rename);
  const renamed: Zones = {};
  for (const [key, list] of Object.entries(fragment.zones)) renamed[key] = list.map(rename);
  const zones: Zones = {};
  for (const [key, list] of Object.entries(renamed)) {
    const sep = key.indexOf(":");
    const parent = key.slice(0, sep);
    zones[`${map.get(parent) ?? parent}${key.slice(sep)}`] = list;
  }
  return { content, zones };
}

/** The page with the fragment added after its last top-level block. */
export function appendFragment(data: Data, fragment: BlockFragment): Data {
  return {
    ...data,
    content: [...(data.content ?? []), ...fragment.content],
    zones: { ...(data.zones ?? {}), ...fragment.zones },
  };
}
