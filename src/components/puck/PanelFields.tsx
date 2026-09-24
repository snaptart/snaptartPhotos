"use client";

import { Children, isValidElement, useEffect, useState, type ReactElement, type ReactNode } from "react";
import { createUsePuck } from "@puckeditor/core";
import { ChevronRight } from "lucide-react";
import { PANEL_LAYOUTS, PANEL_TABS, type PanelGroup, type PanelLayout, type PanelTab } from "@/lib/puck/panel-layout";
import { hideOnSummary, type Breakpoint } from "@/lib/puck/responsive";
import { sameValue } from "./fieldTypes";

/**
 * The properties panel (Puck's `fields` override). Puck hands over one child
 * per field, each carrying its `fieldName`; this sorts them into the selected
 * block's Content / Style / Layout tabs and collapsible groups, and leaves out
 * the ones that don't apply to the current settings.
 */

const usePuckSelector = createUsePuck();

type Props = Record<string, unknown>;
type Group = PanelGroup<Props> & { shown: string[] };

const OPEN_KEY = "puck-panel-groups";

const SHOW_ON: PanelGroup<Props> = {
  tab: "layout",
  title: "Visibility",
  fields: ["hideOn"],
  summary: (p) => hideOnSummary(p.hideOn as Breakpoint[] | undefined),
};

// Fields inside a group sit closer together than Puck's own one-field-per-row
// spacing, with no rule between them. (Puck's field wrappers are the direct
// children; its own rule adds the border and margin this takes off.)
const GROUP_BODY = "[&>*]:mt-0! [&>*]:border-t-0! [&>*]:px-4! [&>*]:pt-1.5! [&>*]:pb-2!";

function readOpenState(): Record<string, boolean> {
  try {
    return JSON.parse(localStorage.getItem(OPEN_KEY) ?? "{}") as Record<string, boolean>;
  } catch {
    return {};
  }
}

function writeOpenState(state: Record<string, boolean>) {
  try {
    localStorage.setItem(OPEN_KEY, JSON.stringify(state));
  } catch {
    // Remembering open groups is a convenience; without storage they reset.
  }
}

export function PanelFields({ children }: { children: ReactNode; isLoading: boolean; itemSelector?: unknown }) {
  const item = usePuckSelector((s) => s.selectedItem);
  const defaults = usePuckSelector((s) =>
    s.selectedItem ? (s.config.components[s.selectedItem.type]?.defaultProps as Props | undefined) : undefined
  );
  const [preferredTab, setPreferredTab] = useState<PanelTab>("content");
  const [openState, setOpenState] = useState<Record<string, boolean>>({});
  useEffect(() => setOpenState(readOpenState()), []);

  const layout = item ? (PANEL_LAYOUTS as Record<string, PanelLayout<Props> | undefined>)[item.type] : undefined;
  if (!item || !layout) return <>{children}</>;

  const props = item.props as Props;
  const byName = new Map<string, ReactElement>();
  Children.forEach(children, (child) => {
    if (isValidElement<{ fieldName?: string }>(child) && child.props.fieldName) {
      byName.set(child.props.fieldName, child);
    }
  });

  const applies = (name: string) => byName.has(name) && (layout.when?.[name]?.(props) ?? true);
  // "Show on" is added to every block (config.tsx), so it gets its own Visibility group rather than a place in each layout.
  const placed = new Set([...layout.groups.flatMap((g) => g.fields), "hideOn"]);
  const leftovers = [...byName.keys()].filter((n) => !placed.has(n));
  const groups: Group[] = [
    ...layout.groups,
    ...(leftovers.length ? [{ tab: "content" as const, title: "More", fields: leftovers }] : []),
    ...(byName.has("hideOn") ? [SHOW_ON] : []),
  ]
    .map((g) => ({ ...g, shown: g.fields.filter(applies) }))
    .filter((g) => g.shown.length > 0);

  const tabs = PANEL_TABS.filter((t) => groups.some((g) => g.tab === t.key));
  const tab = tabs.some((t) => t.key === preferredTab) ? preferredTab : tabs[0]?.key;
  const tabGroups = groups.filter((g) => g.tab === tab);
  // A block whose whole panel is one group needs no header to open and close.
  const bare = groups.length === 1;

  const isOpen = (g: Group) => {
    const saved = openState[`${item.type}.${g.title}`];
    return saved ?? !g.collapsed;
  };
  const toggle = (g: Group) => {
    const next = { ...openState, [`${item.type}.${g.title}`]: !isOpen(g) };
    setOpenState(next);
    writeOpenState(next);
  };

  return (
    <div className="puck-panel">
      {tabs.length > 1 && (
        <div role="tablist" className="sticky top-0 z-10 flex border-b border-admin-border bg-admin-surface px-2">
          {tabs.map((t) => (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={t.key === tab}
              onClick={() => setPreferredTab(t.key)}
              className={`-mb-px flex-1 border-b-2 px-2 py-2.5 text-[12px] font-medium transition-colors ${
                t.key === tab
                  ? "border-admin-accent text-admin-ink"
                  : "border-transparent text-admin-ink-faint hover:text-admin-ink"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      )}

      {tabGroups.map((g) => {
        const fields = g.shown.map((name) => byName.get(name));
        if (bare || !g.title) {
          return (
            <div key={g.title ?? "fields"} className={`py-1 ${GROUP_BODY}`}>
              {fields}
            </div>
          );
        }
        const open = isOpen(g);
        const changed = defaults
          ? g.shown.some((name) => defaults[name] !== undefined && props[name] !== undefined && !sameValue(props[name], defaults[name]))
          : false;
        const summary = !open ? g.summary?.(props) : undefined;
        return (
          <section key={g.title} className="border-b border-admin-border">
            <button
              type="button"
              onClick={() => toggle(g)}
              aria-expanded={open}
              className="flex w-full items-center gap-1.5 px-3 py-2.5 text-left hover:bg-admin-surface-2"
            >
              <ChevronRight
                size={14}
                className={`shrink-0 text-admin-ink-faint transition-transform ${open ? "rotate-90" : ""}`}
              />
              <span className="shrink-0 text-[12px] font-semibold text-admin-ink">{g.title}</span>
              {changed && (
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-admin-accent" title="Has settings changed from the default" />
              )}
              {summary && (
                <span className="ml-auto min-w-0 truncate pl-3 text-[12px] text-admin-ink-faint">{summary}</span>
              )}
            </button>
            {open && <div className={`pb-2 ${GROUP_BODY}`}>{fields}</div>}
          </section>
        );
      })}
    </div>
  );
}
