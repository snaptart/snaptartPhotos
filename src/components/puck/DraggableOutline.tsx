"use client";

import React, { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { createUsePuck } from "@puckeditor/core";
import type { Config, ComponentData, Data } from "@puckeditor/core";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
  pointerWithin,
  rectIntersection,
  MeasuringStrategy,
  type CollisionDetection,
  type DragStartEvent,
  type DragMoveEvent,
  type DragOverEvent,
  type DragEndEvent,
} from "@dnd-kit/core";

// Inline SVG icons (no lucide-react dependency)
const IconGrip = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="9" cy="5" r="1"/><circle cx="15" cy="5" r="1"/>
    <circle cx="9" cy="12" r="1"/><circle cx="15" cy="12" r="1"/>
    <circle cx="9" cy="19" r="1"/><circle cx="15" cy="19" r="1"/>
  </svg>
);
const IconChevronDown = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m6 9 6 6 6-6"/>
  </svg>
);
const IconChevronRight = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m9 18 6-6-6-6"/>
  </svg>
);
const IconGrid = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/>
    <rect width="7" height="7" x="3" y="14" rx="1"/><rect width="7" height="7" x="14" y="14" rx="1"/>
  </svg>
);
const IconType = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="4 7 4 4 20 4 20 7"/><line x1="9" x2="15" y1="20" y2="20"/><line x1="12" x2="12" y1="4" y2="20"/>
  </svg>
);
const IconBox = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/>
    <path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/>
  </svg>
);
const IconMore = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/>
  </svg>
);

const usePuck = createUsePuck();

const ROOT_ZONE = "root:default-zone";

/** How long to hover a collapsed container mid-drag before it opens. */
const HOVER_EXPAND_MS = 500;

// ── Types ──────────────────────────────────────────────────────────

type ZoneMap = Record<string, ComponentData[]>;

interface ZoneModel {
  compound: string; // `${parentId}:${zoneName}`
  name: string; // zone name, e.g. "column-0"
  label: string; // human label, e.g. "Column 1"
  depth: number; // nesting depth, for indentation
  /** False when the zone has not been registered in data.zones yet. */
  exists: boolean;
  items: ItemModel[];
}

interface ItemModel {
  id: string;
  type: string;
  label: string;
  zone: string; // zone compound this item belongs to
  index: number; // index within its zone
  depth: number;
  zones: ZoneModel[]; // child zones
  ancestorIds: string[]; // component ids from root down to (not including) this item
}

/** Where a drag will land. `index` is an insertion index within `zone`. */
interface DropTarget {
  kind: "before" | "after" | "into";
  zone: string;
  index: number;
  /** Row the indicator is drawn against, for before/after. */
  overId?: string;
}

// ── Helpers ────────────────────────────────────────────────────────

function getComponentLabel(type: string, config: Config): string {
  return (config.components[type] as { label?: string } | undefined)?.label ?? type;
}

/**
 * Zone names each container type renders. Mirrors the <DropZone> calls in
 * src/lib/puck/config.tsx (Container, Columns) and
 * src/components/puck/form/FormWrapper.tsx (Form).
 *
 * We derive these rather than relying solely on data.zones because Puck
 * unregisters a zone whenever its <DropZone> unmounts, which would otherwise
 * make a container look like a childless leaf with no way to drop into it.
 */
function expectedZoneNames(comp: ComponentData): string[] {
  switch (comp.type) {
    case "Container":
      return ["container-content"];
    case "Form":
      return ["form-fields"];
    case "Columns": {
      const count = (comp.props as { columns?: string }).columns === "3" ? 3 : 2;
      return Array.from({ length: count }, (_, i) => `column-${i}`);
    }
    default:
      return [];
  }
}

/** Expected zones first (so columns stay in order), then any extras already in data. */
function zoneNamesFor(comp: ComponentData, zones: ZoneMap): string[] {
  const names = expectedZoneNames(comp);
  const prefix = `${comp.props.id}:`;
  for (const compound of Object.keys(zones)) {
    if (!compound.startsWith(prefix)) continue;
    const name = compound.slice(prefix.length);
    if (!names.includes(name)) names.push(name);
  }
  return names;
}

function zoneLabel(name: string): string {
  const column = /^column-(\d+)$/.exec(name);
  if (column) return `Column ${Number(column[1]) + 1}`;
  if (name === "container-content") return "Content";
  if (name === "form-fields") return "Fields";
  return name.replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

interface Tree {
  root: ZoneModel;
  itemsById: Map<string, ItemModel>;
  zonesByCompound: Map<string, ZoneModel>;
}

function buildTree(data: Data, config: Config): Tree {
  const zones = (data.zones ?? {}) as ZoneMap;
  const itemsById = new Map<string, ItemModel>();
  const zonesByCompound = new Map<string, ZoneModel>();
  const seen = new Set<string>();

  const buildZone = (
    compound: string,
    name: string,
    exists: boolean,
    depth: number,
    ancestorIds: string[]
  ): ZoneModel => {
    const content = compound === ROOT_ZONE ? data.content ?? [] : zones[compound] ?? [];

    const zone: ZoneModel = {
      compound,
      name,
      label: zoneLabel(name),
      depth,
      exists,
      items: [],
    };
    zonesByCompound.set(compound, zone);

    zone.items = content.map((comp, index) => {
      const id = comp.props.id;
      const item: ItemModel = {
        id,
        type: comp.type,
        label: getComponentLabel(comp.type, config),
        zone: compound,
        index,
        depth,
        zones: [],
        ancestorIds,
      };
      itemsById.set(id, item);

      // Guard against a malformed document producing a cycle.
      if (!seen.has(id)) {
        seen.add(id);
        const childAncestors = [...ancestorIds, id];
        item.zones = zoneNamesFor(comp, zones).map((zoneName) => {
          const childCompound = `${id}:${zoneName}`;
          return buildZone(
            childCompound,
            zoneName,
            Object.prototype.hasOwnProperty.call(zones, childCompound),
            depth + 1,
            childAncestors
          );
        });
      }

      return item;
    });

    return zone;
  };

  const root = buildZone(ROOT_ZONE, "default-zone", true, 0, []);
  return { root, itemsById, zonesByCompound };
}

/** A move is invalid if the destination zone sits inside the item being moved. */
function isDescendantZone(zoneCompound: string, itemId: string, tree: Tree): boolean {
  const parentId = zoneCompound.split(":")[0];
  if (parentId === itemId) return true;
  const parent = tree.itemsById.get(parentId);
  return parent ? parent.ancestorIds.includes(itemId) : false;
}

/** Flat list of every zone that can receive an item, with a breadcrumb label. */
function collectDestinations(tree: Tree): { compound: string; label: string }[] {
  const out: { compound: string; label: string }[] = [{ compound: ROOT_ZONE, label: "Top level" }];

  const walk = (zone: ZoneModel, prefix: string) => {
    for (const item of zone.items) {
      for (const child of item.zones) {
        const label = item.zones.length > 1
          ? `${prefix}${item.label} › ${child.label}`
          : `${prefix}${item.label}`;
        out.push({ compound: child.compound, label });
        walk(child, `${label} › `);
      }
    }
  };

  walk(tree.root, "");
  return out;
}

// ── Row menu (portalled so the narrow outline panel can't clip it) ──

function RowMenu({
  item,
  tree,
  onMove,
}: {
  item: ItemModel;
  tree: Tree;
  onMove: (destZone: string, destIndex: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const [anchor, setAnchor] = useState<{ top: number; left: number } | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    // Scrolling the menu's own destination list must not dismiss it.
    const closeOnOutsideScroll = (e: Event) => {
      if (menuRef.current?.contains(e.target as Node)) return;
      setOpen(false);
    };
    window.addEventListener("pointerdown", close);
    window.addEventListener("resize", close);
    window.addEventListener("scroll", closeOnOutsideScroll, true);
    return () => {
      window.removeEventListener("pointerdown", close);
      window.removeEventListener("resize", close);
      window.removeEventListener("scroll", closeOnOutsideScroll, true);
    };
  }, [open]);

  const siblings = tree.zonesByCompound.get(item.zone)?.items.length ?? 0;

  const destinations = useMemo(
    () =>
      collectDestinations(tree).filter(
        (d) => d.compound !== item.zone && !isDescendantZone(d.compound, item.id, tree)
      ),
    [tree, item.zone, item.id]
  );

  const toggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (open) {
      setOpen(false);
      return;
    }
    const rect = buttonRef.current?.getBoundingClientRect();
    if (rect) setAnchor({ top: rect.bottom + 4, left: Math.max(8, rect.right - 224) });
    setOpen(true);
  };

  const choose = (destZone: string, destIndex: number) => {
    setOpen(false);
    onMove(destZone, destIndex);
  };

  return (
    <>
      <button
        ref={buttonRef}
        className="ml-1 rounded p-1 text-neutral-400 hover:bg-neutral-200 hover:text-neutral-700"
        // Keep the window dismiss-listener from racing the click handler.
        onPointerDown={(e) => e.stopPropagation()}
        onClick={toggle}
        aria-label={`Move ${item.label}`}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <IconMore />
      </button>

      {open && anchor &&
        createPortal(
          <div
            ref={menuRef}
            role="menu"
            className="fixed z-[9999] max-h-80 w-56 overflow-y-auto rounded-md border border-neutral-200 bg-white py-1 font-sans text-sm shadow-lg"
            style={{ top: anchor.top, left: anchor.left }}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <button
              role="menuitem"
              className="block w-full px-3 py-1.5 text-left hover:bg-neutral-100 disabled:opacity-40 disabled:hover:bg-transparent"
              disabled={item.index === 0}
              onClick={() => choose(item.zone, item.index - 1)}
            >
              Move up
            </button>
            <button
              role="menuitem"
              className="block w-full px-3 py-1.5 text-left hover:bg-neutral-100 disabled:opacity-40 disabled:hover:bg-transparent"
              disabled={item.index >= siblings - 1}
              onClick={() => choose(item.zone, item.index + 2)}
            >
              Move down
            </button>

            {destinations.length > 0 && (
              <>
                <div className="my-1 border-t border-neutral-200" />
                <div className="px-3 py-1 text-xs font-medium uppercase tracking-wider text-neutral-400">
                  Move into
                </div>
                {destinations.map((d) => (
                  <button
                    key={d.compound}
                    role="menuitem"
                    className="block w-full truncate px-3 py-1.5 text-left hover:bg-neutral-100"
                    title={d.label}
                    onClick={() =>
                      choose(d.compound, tree.zonesByCompound.get(d.compound)?.items.length ?? 0)
                    }
                  >
                    {d.label}
                  </button>
                ))}
              </>
            )}
          </div>,
          document.body
        )}
    </>
  );
}

// ── Row ────────────────────────────────────────────────────────────

function OutlineRow({
  item,
  tree,
  selectedId,
  onSelect,
  expandedItems,
  onToggleExpand,
  dropTarget,
  activeId,
  onMove,
}: {
  item: ItemModel;
  tree: Tree;
  selectedId: string | null;
  onSelect: (id: string, index: number, zone: string) => void;
  expandedItems: Set<string>;
  onToggleExpand: (id: string) => void;
  dropTarget: DropTarget | null;
  activeId: string | null;
  onMove: (item: ItemModel, destZone: string, destIndex: number) => void;
}) {
  const { attributes, listeners, setNodeRef: setDragRef, isDragging } = useDraggable({
    id: `row:${item.id}`,
    data: { kind: "row", itemId: item.id },
  });

  const { setNodeRef: setDropRef } = useDroppable({
    id: `row:${item.id}`,
    data: { kind: "row", itemId: item.id },
  });

  const isSelected = selectedId === item.id;
  const isExpanded = expandedItems.has(item.id);
  const hasChildren = item.zones.length > 0;
  const isTextLike = item.type === "Text" || item.type === "Heading" || item.type === "RichText";

  // Row-level "drop into" only applies to single-zone containers; multi-zone
  // containers (Columns) are ambiguous, so they expand on hover instead.
  const soleZone = item.zones.length === 1 ? item.zones[0] : null;

  const showBefore = dropTarget?.kind === "before" && dropTarget.overId === item.id;
  const showAfter = dropTarget?.kind === "after" && dropTarget.overId === item.id;
  const showInto = dropTarget?.kind === "into" && soleZone?.compound === dropTarget.zone;

  return (
    <li className="list-none">
      <div
        ref={setDropRef}
        className={`relative flex items-center rounded px-2 py-1.5 text-sm transition-colors ${
          showInto
            ? "bg-blue-50 ring-2 ring-blue-500"
            : isSelected
              ? "border border-blue-300 bg-blue-100"
              : "border border-transparent hover:bg-neutral-100"
        }`}
        style={{ paddingLeft: 8 + item.depth * 20, opacity: isDragging ? 0.4 : 1 }}
      >
        {showBefore && (
          <span className="pointer-events-none absolute inset-x-1 -top-px z-10 h-0.5 rounded bg-blue-500" />
        )}
        {showAfter && (
          <span className="pointer-events-none absolute inset-x-1 -bottom-px z-10 h-0.5 rounded bg-blue-500" />
        )}

        {/* Drag handle */}
        <button
          ref={setDragRef}
          className="mr-2 cursor-grab touch-none rounded p-1 text-neutral-400 hover:text-neutral-600 active:cursor-grabbing"
          aria-label={`Drag ${item.label}`}
          {...attributes}
          {...listeners}
        >
          <IconGrip />
        </button>

        {/* Expand/collapse chevron */}
        {hasChildren ? (
          <button
            className="mr-1.5 p-1 text-neutral-400 hover:text-neutral-600"
            aria-label={isExpanded ? `Collapse ${item.label}` : `Expand ${item.label}`}
            aria-expanded={isExpanded}
            onClick={() => onToggleExpand(item.id)}
          >
            {isExpanded ? <IconChevronDown /> : <IconChevronRight />}
          </button>
        ) : (
          <span className="mr-1.5 inline-block w-[24px]" />
        )}

        {/* Icon */}
        <span className="mr-2 text-rose-400">
          {hasChildren ? <IconBox /> : isTextLike ? <IconType /> : <IconGrid />}
        </span>

        {/* Label — click to select */}
        <button
          className="flex-1 truncate text-left text-neutral-700 hover:text-neutral-900"
          onClick={() => onSelect(item.id, item.index, item.zone)}
        >
          {item.label}
        </button>

        <RowMenu item={item} tree={tree} onMove={(zone, index) => onMove(item, zone, index)} />
      </div>

      {/* Child zones */}
      {hasChildren && isExpanded && (
        <div className="mt-0.5">
          {item.zones.map((childZone) => (
            <OutlineZone
              key={childZone.compound}
              zone={childZone}
              tree={tree}
              selectedId={selectedId}
              onSelect={onSelect}
              expandedItems={expandedItems}
              onToggleExpand={onToggleExpand}
              dropTarget={dropTarget}
              activeId={activeId}
              onMove={onMove}
              showLabel={item.zones.length > 1}
            />
          ))}
        </div>
      )}
    </li>
  );
}

// ── Zone ───────────────────────────────────────────────────────────

function OutlineZone({
  zone,
  tree,
  selectedId,
  onSelect,
  expandedItems,
  onToggleExpand,
  dropTarget,
  activeId,
  onMove,
  showLabel = false,
}: {
  zone: ZoneModel;
  tree: Tree;
  selectedId: string | null;
  onSelect: (id: string, index: number, zone: string) => void;
  expandedItems: Set<string>;
  onToggleExpand: (id: string) => void;
  dropTarget: DropTarget | null;
  activeId: string | null;
  onMove: (item: ItemModel, destZone: string, destIndex: number) => void;
  showLabel?: boolean;
}) {
  // The end-of-zone droppable is what makes an empty container reachable, and
  // what makes "append to the end of this zone" expressible at all.
  const { setNodeRef } = useDroppable({
    id: `zoneend:${zone.compound}`,
    data: { kind: "zoneEnd", zone: zone.compound },
  });

  const isEmpty = zone.items.length === 0;
  const isTarget = dropTarget?.kind === "into" && dropTarget.zone === zone.compound;
  const dragging = activeId !== null;
  const indent = 8 + zone.depth * 20;

  return (
    <div>
      {showLabel && (
        <div
          className="mb-1 mt-2 text-xs font-medium uppercase tracking-wider text-neutral-400"
          style={{ paddingLeft: indent }}
        >
          {zone.label}
        </div>
      )}
      <ul className="m-0 list-none p-0">
        {zone.items.map((item) => (
          <OutlineRow
            key={item.id}
            item={item}
            tree={tree}
            selectedId={selectedId}
            onSelect={onSelect}
            expandedItems={expandedItems}
            onToggleExpand={onToggleExpand}
            dropTarget={dropTarget}
            activeId={activeId}
            onMove={onMove}
          />
        ))}
      </ul>

      {isEmpty ? (
        <div
          ref={setNodeRef}
          className={`my-1 rounded border border-dashed px-2 py-2 text-center text-xs transition-colors ${
            isTarget
              ? "border-blue-500 bg-blue-50 text-blue-600"
              : dragging
                ? "border-blue-300 text-blue-400"
                : "border-neutral-200 text-neutral-400"
          }`}
          style={{ marginLeft: indent }}
        >
          {dragging ? "Drop here" : "Empty"}
        </div>
      ) : (
        <div ref={setNodeRef} className="relative h-2">
          {isTarget && (
            <span className="pointer-events-none absolute inset-x-1 top-0 h-0.5 rounded bg-blue-500" />
          )}
        </div>
      )}
    </div>
  );
}

// ── Main Outline Component ─────────────────────────────────────────

export default function DraggableOutline() {
  const dispatch = usePuck((s) => s.dispatch);
  const data = usePuck((s) => s.appState.data);
  const config = usePuck((s) => s.config);
  const selectedItem = usePuck((s) => s.selectedItem);

  const selectedId = selectedItem?.props?.id ?? null;

  const tree = useMemo(() => buildTree(data, config), [data, config]);
  const treeRef = useRef(tree);
  treeRef.current = tree;

  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [activeId, setActiveId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<DropTarget | null>(null);

  const pointerRef = useRef<{ x: number; y: number } | null>(null);
  const hoverExpandRef = useRef<{ id: string; timer: ReturnType<typeof setTimeout> } | null>(null);
  /** The expanded set as actually rendered, read from inside drag handlers. */
  const expandedRef = useRef<Set<string>>(expandedItems);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } })
  );

  const clearHoverExpand = useCallback(() => {
    if (hoverExpandRef.current) {
      clearTimeout(hoverExpandRef.current.timer);
      hoverExpandRef.current = null;
    }
  }, []);

  useEffect(() => clearHoverExpand, [clearHoverExpand]);

  const handleToggleExpand = useCallback((id: string) => {
    setExpandedItems((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleSelect = useCallback(
    (id: string, index: number, zone: string) => {
      if (selectedId === id) {
        dispatch({ type: "setUi", ui: { itemSelector: null } });
      } else {
        dispatch({ type: "setUi", ui: { itemSelector: { index, zone } } });
      }
    },
    [dispatch, selectedId]
  );

  /**
   * Move an item to `destIndex` within `destZone`, where `destIndex` is an
   * insertion index into the zone as it looks *before* the move.
   */
  const applyMove = useCallback(
    (item: ItemModel, destZone: string, destIndex: number) => {
      if (isDescendantZone(destZone, item.id, treeRef.current)) return;

      // Puck only walks zones present in data.zones, so moving into an
      // unregistered zone would drop the item on the floor. Create it first.
      if (!treeRef.current.zonesByCompound.get(destZone)?.exists) {
        dispatch({ type: "registerZone", zone: destZone });
      }

      let finalIndex = destIndex;

      if (item.zone === destZone) {
        // reorder is remove-then-insert, so an index past the source shifts down.
        if (destIndex > item.index) finalIndex = destIndex - 1;
        if (finalIndex === item.index) return;
        dispatch({
          type: "reorder",
          sourceIndex: item.index,
          destinationIndex: finalIndex,
          destinationZone: destZone,
        });
      } else {
        dispatch({
          type: "move",
          sourceIndex: item.index,
          sourceZone: item.zone,
          destinationIndex: destIndex,
          destinationZone: destZone,
        });
      }

      // Keep the selection on the item the user just moved rather than letting
      // it point at whatever now sits at the old index.
      dispatch({ type: "setUi", ui: { itemSelector: { index: finalIndex, zone: destZone } } });

      // Make sure the destination is open so the move is visible.
      const destParentId = destZone.split(":")[0];
      if (destParentId !== "root") {
        setExpandedItems((prev) => new Set(prev).add(destParentId));
      }
    },
    [dispatch]
  );

  const handleRowMove = useCallback(
    (item: ItemModel, destZone: string, destIndex: number) => applyMove(item, destZone, destIndex),
    [applyMove]
  );

  // pointerWithin gives us pointer-accurate targeting for a dense tree;
  // rectIntersection is the fallback when the pointer sits in a gap.
  const collisionDetection = useCallback<CollisionDetection>((args) => {
    if (args.pointerCoordinates) pointerRef.current = args.pointerCoordinates;
    const hits = pointerWithin(args);
    return hits.length > 0 ? hits : rectIntersection(args);
  }, []);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const itemId = (event.active.data.current as { itemId?: string } | undefined)?.itemId;
    setActiveId(itemId ?? null);
    setDropTarget(null);
  }, []);

  const handleDragMove = useCallback(
    (event: DragMoveEvent | DragOverEvent) => {
      const { active, over } = event;
      const activeItemId = (active.data.current as { itemId?: string } | undefined)?.itemId;
      if (!over || !activeItemId) {
        setDropTarget(null);
        clearHoverExpand();
        return;
      }

      const overData = over.data.current as
        | { kind: "row"; itemId: string }
        | { kind: "zoneEnd"; zone: string }
        | undefined;
      if (!overData) {
        setDropTarget(null);
        return;
      }

      const currentTree = treeRef.current;
      let next: DropTarget | null = null;

      if (overData.kind === "zoneEnd") {
        next = {
          kind: "into",
          zone: overData.zone,
          index: currentTree.zonesByCompound.get(overData.zone)?.items.length ?? 0,
        };
        clearHoverExpand();
      } else {
        const overItem = currentTree.itemsById.get(overData.itemId);
        if (overItem && overItem.id !== activeItemId) {
          const rect = over.rect;
          const y = pointerRef.current?.y ?? rect.top + rect.height / 2;
          const ratio = rect.height > 0 ? (y - rect.top) / rect.height : 0.5;

          const soleZone = overItem.zones.length === 1 ? overItem.zones[0] : null;

          if (soleZone && ratio > 0.25 && ratio < 0.75) {
            next = { kind: "into", zone: soleZone.compound, index: soleZone.items.length };
          } else if (ratio < 0.5) {
            next = { kind: "before", zone: overItem.zone, index: overItem.index, overId: overItem.id };
          } else {
            next = { kind: "after", zone: overItem.zone, index: overItem.index + 1, overId: overItem.id };
          }

          // Hovering a collapsed container opens it so its zones become targets.
          if (overItem.zones.length > 0 && !expandedRef.current.has(overItem.id)) {
            if (hoverExpandRef.current?.id !== overItem.id) {
              clearHoverExpand();
              hoverExpandRef.current = {
                id: overItem.id,
                timer: setTimeout(() => {
                  setExpandedItems((prev) => new Set(prev).add(overItem.id));
                  hoverExpandRef.current = null;
                }, HOVER_EXPAND_MS),
              };
            }
          } else {
            clearHoverExpand();
          }
        }
      }

      if (next && isDescendantZone(next.zone, activeItemId, currentTree)) next = null;
      setDropTarget(next);
    },
    [clearHoverExpand]
  );

  const finishDrag = useCallback(() => {
    clearHoverExpand();
    setActiveId(null);
    setDropTarget(null);
  }, [clearHoverExpand]);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const activeItemId = (event.active.data.current as { itemId?: string } | undefined)?.itemId;
      const target = dropTarget;
      finishDrag();

      if (!activeItemId || !target) return;
      const item = treeRef.current.itemsById.get(activeItemId);
      if (!item) return;

      applyMove(item, target.zone, target.index);
    },
    [dropTarget, applyMove, finishDrag]
  );

  // Auto-expand the parent of the selected item
  const expandedWithSelected = useMemo(() => {
    const set = new Set(expandedItems);
    const selected = selectedId ? tree.itemsById.get(selectedId) : null;
    if (selected) for (const ancestorId of selected.ancestorIds) set.add(ancestorId);
    return set;
  }, [expandedItems, selectedId, tree]);

  expandedRef.current = expandedWithSelected;

  const activeItem = activeId ? tree.itemsById.get(activeId) : null;

  return (
    <div className="puck-draggable-outline font-sans text-sm">
      <DndContext
        sensors={sensors}
        collisionDetection={collisionDetection}
        // Hover-to-expand inserts rows mid-drag, so rects measured once at drag
        // start would immediately be stale.
        measuring={{ droppable: { strategy: MeasuringStrategy.Always } }}
        onDragStart={handleDragStart}
        onDragMove={handleDragMove}
        // Also recompute when the target changes without pointer movement,
        // e.g. right after hover-to-expand reflows the tree.
        onDragOver={handleDragMove}
        onDragEnd={handleDragEnd}
        onDragCancel={finishDrag}
      >
        <OutlineZone
          zone={tree.root}
          tree={tree}
          selectedId={selectedId}
          onSelect={handleSelect}
          expandedItems={expandedWithSelected}
          onToggleExpand={handleToggleExpand}
          dropTarget={dropTarget}
          activeId={activeId}
          onMove={handleRowMove}
        />

        <DragOverlay dropAnimation={null}>
          {activeItem && (
            <div className="flex items-center gap-2 rounded border border-blue-300 bg-white px-2 py-1.5 text-sm shadow-lg">
              <span className="text-rose-400">
                {activeItem.zones.length > 0 ? <IconBox /> : <IconGrid />}
              </span>
              <span className="truncate text-neutral-700">{activeItem.label}</span>
            </div>
          )}
        </DragOverlay>
      </DndContext>
    </div>
  );
}

// ── Plugin factory ─────────────────────────────────────────────────

export function draggableOutlinePlugin() {
  return {
    overrides: {
      outline: () => <DraggableOutline />,
    },
  };
}
