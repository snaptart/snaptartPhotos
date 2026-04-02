"use client";

import { useCallback } from "react";
import {
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";

interface UseSortableListOptions<T extends { id: string }> {
  items: T[];
  setItems: (items: T[]) => void;
  endpoint: string;
  onError?: (msg: string) => void;
  /** Extra body fields to include in the reorder PUT request */
  extraBody?: Record<string, unknown>;
}

export function useSortableList<T extends { id: string }>({
  items,
  setItems,
  endpoint,
  onError,
  extraBody,
}: UseSortableListOptions<T>) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const oldIndex = items.findIndex((item) => item.id === active.id);
      const newIndex = items.findIndex((item) => item.id === over.id);
      const reordered = arrayMove(items, oldIndex, newIndex);
      setItems(reordered);

      const res = await fetch(endpoint, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...extraBody,
          items: reordered.map((item, index) => ({ id: item.id, position: index })),
        }),
      });
      if (!res.ok) onError?.("Failed to save order. Refresh to sync.");
    },
    [items, setItems, endpoint, onError, extraBody]
  );

  return { sensors, handleDragEnd };
}
