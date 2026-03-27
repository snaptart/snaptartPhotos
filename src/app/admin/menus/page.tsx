"use client";

import { useEffect, useState, useCallback } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { SortableItem } from "@/components/admin/SortableItem";

interface MenuItem {
  id: string;
  label: string;
  url: string;
  targetType: string;
  targetId: string | null;
  position: number;
  parentId: string | null;
}

export default function MenusPage() {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const fetchItems = useCallback(async () => {
    const res = await fetch("/api/menu-items");
    const data = await res.json();
    setItems(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = items.findIndex((i) => i.id === active.id);
    const newIndex = items.findIndex((i) => i.id === over.id);
    const reordered = arrayMove(items, oldIndex, newIndex);

    setItems(reordered);

    await fetch("/api/menu-items", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: reordered.map((item, index) => ({ id: item.id, position: index })),
      }),
    });
  }

  async function handleAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);

    const res = await fetch("/api/menu-items", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        label: form.get("label"),
        url: form.get("url"),
        targetType: form.get("targetType"),
        position: items.length,
      }),
    });

    if (res.ok) {
      setShowForm(false);
      setMessage("Menu item added!");
      fetchItems();
    }
  }

  async function handleUpdate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);

    const res = await fetch("/api/menu-items", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: editingId,
        label: form.get("label"),
        url: form.get("url"),
        targetType: form.get("targetType"),
      }),
    });

    if (res.ok) {
      setEditingId(null);
      setMessage("Menu item updated!");
      fetchItems();
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this menu item?")) return;
    await fetch(`/api/menu-items?id=${id}`, { method: "DELETE" });
    setMessage("Menu item deleted");
    fetchItems();
  }

  if (loading) return <div className="text-neutral-500">Loading...</div>;

  const editingItem = items.find((i) => i.id === editingId);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Menu Management</h1>
        <button
          onClick={() => { setShowForm(true); setEditingId(null); }}
          className="rounded bg-neutral-900 px-4 py-2 text-sm text-white hover:bg-neutral-700"
        >
          Add Menu Item
        </button>
      </div>

      {message && (
        <div className="mb-4 rounded bg-green-50 px-3 py-2 text-sm text-green-600">
          {message}
        </div>
      )}

      {/* Add / Edit Form */}
      {(showForm || editingId) && (
        <form
          onSubmit={editingId ? handleUpdate : handleAdd}
          className="mb-6 rounded-lg border border-neutral-200 bg-white p-4"
        >
          <h2 className="mb-3 text-sm font-medium">
            {editingId ? "Edit Menu Item" : "New Menu Item"}
          </h2>
          <div className="flex flex-wrap gap-3">
            <input
              name="label"
              placeholder="Label"
              defaultValue={editingItem?.label ?? ""}
              required
              className="rounded border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none"
            />
            <input
              name="url"
              placeholder="URL (e.g. /about or /gallery/places)"
              defaultValue={editingItem?.url ?? ""}
              required
              className="flex-1 rounded border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none"
            />
            <select
              name="targetType"
              defaultValue={editingItem?.targetType ?? "page"}
              className="rounded border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none"
            >
              <option value="page">Page</option>
              <option value="gallery">Gallery</option>
              <option value="external">External Link</option>
            </select>
            <button
              type="submit"
              className="rounded bg-neutral-900 px-4 py-2 text-sm text-white hover:bg-neutral-700"
            >
              {editingId ? "Update" : "Add"}
            </button>
            <button
              type="button"
              onClick={() => { setShowForm(false); setEditingId(null); }}
              className="rounded border border-neutral-300 px-4 py-2 text-sm hover:bg-neutral-50"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Sortable List */}
      {items.length === 0 ? (
        <p className="text-sm text-neutral-500">No menu items yet. Add one to get started.</p>
      ) : (
        <div className="rounded-lg border border-neutral-200 bg-white">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
              {items.map((item) => (
                <SortableItem key={item.id} id={item.id}>
                  <div className="flex items-center justify-between border-b border-neutral-100 px-4 py-3 last:border-0">
                    <div>
                      <span className="font-medium">{item.label}</span>
                      <span className="ml-3 text-sm text-neutral-400">{item.url}</span>
                      <span className="ml-2 rounded bg-neutral-100 px-1.5 py-0.5 text-xs text-neutral-500">
                        {item.targetType}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => { setEditingId(item.id); setShowForm(false); }}
                        className="text-sm text-neutral-500 hover:text-neutral-900"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="text-sm text-red-500 hover:text-red-700"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </SortableItem>
              ))}
            </SortableContext>
          </DndContext>
        </div>
      )}
    </div>
  );
}
