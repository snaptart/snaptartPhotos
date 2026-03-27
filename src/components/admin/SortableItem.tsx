"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

export function SortableItem({
  id,
  children,
}: {
  id: string;
  children: React.ReactNode;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-3">
      <button
        type="button"
        className="cursor-grab touch-none px-1 text-neutral-400 hover:text-neutral-600"
        {...attributes}
        {...listeners}
      >
        ⠿
      </button>
      <div className="flex-1">{children}</div>
    </div>
  );
}
