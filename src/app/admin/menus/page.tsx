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

interface LinkOption {
  id: string;
  title: string;
  slug: string;
  isPublished: boolean;
}

interface FormState {
  label: string;
  url: string;
  targetType: string;
  targetId: string | null;
}

const emptyForm: FormState = { label: "", url: "", targetType: "page", targetId: null };

export default function MenusPage() {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [form, setForm] = useState<FormState>(emptyForm);

  const [pageOptions, setPageOptions] = useState<LinkOption[]>([]);
  const [galleryOptions, setGalleryOptions] = useState<LinkOption[]>([]);

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

  const fetchOptions = useCallback(async () => {
    const [pagesRes, galleriesRes] = await Promise.all([
      fetch("/api/pages"),
      fetch("/api/galleries"),
    ]);
    const pagesData = await pagesRes.json();
    const galleriesData = await galleriesRes.json();
    setPageOptions(pagesData as LinkOption[]);
    setGalleryOptions(galleriesData as LinkOption[]);
  }, []);

  useEffect(() => {
    fetchItems();
    fetchOptions();
  }, [fetchItems, fetchOptions]);

  function openAddForm() {
    setForm(emptyForm);
    setShowForm(true);
    setEditingId(null);
  }

  function openEditForm(item: MenuItem) {
    setForm({
      label: item.label,
      url: item.url,
      targetType: item.targetType,
      targetId: item.targetId,
    });
    setEditingId(item.id);
    setShowForm(false);
  }

  function handleTargetTypeChange(targetType: string) {
    setForm({ label: "", url: "", targetType, targetId: null });
  }

  function handleTargetSelect(id: string) {
    const options = form.targetType === "page" ? pageOptions : galleryOptions;
    const selected = options.find((o) => o.id === id);
    if (!selected) return;

    const urlPrefix = form.targetType === "page" ? "/" : "/gallery/";
    setForm((prev) => ({
      ...prev,
      targetId: selected.id,
      label: prev.label || selected.title,
      url: urlPrefix + selected.slug,
    }));
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = items.findIndex((i) => i.id === active.id);
    const newIndex = items.findIndex((i) => i.id === over.id);
    const reordered = arrayMove(items, oldIndex, newIndex);

    setItems(reordered);

    const res = await fetch("/api/menu-items", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: reordered.map((item, index) => ({ id: item.id, position: index })),
      }),
    });
    if (!res.ok) setMessage("Failed to save order. Refresh to sync.");
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const payload = editingId
      ? { id: editingId, label: form.label, url: form.url, targetType: form.targetType, targetId: form.targetId }
      : { label: form.label, url: form.url, targetType: form.targetType, targetId: form.targetId, position: items.length };

    const res = await fetch("/api/menu-items", {
      method: editingId ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      setShowForm(false);
      setEditingId(null);
      setForm(emptyForm);
      setMessage(editingId ? "Menu item updated!" : "Menu item added!");
      fetchItems();
    } else {
      setMessage("Failed to save menu item");
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this menu item?")) return;
    const res = await fetch(`/api/menu-items?id=${id}`, { method: "DELETE" });
    if (res.ok) {
      setMessage("Menu item deleted");
      fetchItems();
    } else {
      setMessage("Failed to delete menu item");
    }
  }

  if (loading) return <div className="text-neutral-500">Loading...</div>;

  const currentOptions = form.targetType === "page" ? pageOptions : galleryOptions;
  const isLinkType = form.targetType === "page" || form.targetType === "gallery";

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Menu Management</h1>
        <button
          onClick={openAddForm}
          className="btn-primary"
        >
          Add Menu Item
        </button>
      </div>

      {message && (
        <div className="alert-success">{message}</div>
      )}

      {/* Add / Edit Form */}
      {(showForm || editingId) && (
        <form
          onSubmit={handleSubmit}
          className="mb-6 rounded-lg border border-neutral-200 bg-white p-4"
        >
          <h2 className="mb-3 text-sm font-medium">
            {editingId ? "Edit Menu Item" : "New Menu Item"}
          </h2>
          <div className="flex flex-col gap-3">
            {/* Row 1: Target type */}
            <div className="flex gap-3">
              <select
                value={form.targetType}
                onChange={(e) => handleTargetTypeChange(e.target.value)}
                className="rounded border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none"
              >
                <option value="page">Page</option>
                <option value="gallery">Gallery</option>
                <option value="external">External Link</option>
              </select>

              {/* Target selector for page/gallery */}
              {isLinkType && (
                <select
                  value={form.targetId ?? ""}
                  onChange={(e) => handleTargetSelect(e.target.value)}
                  className="flex-1 rounded border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none"
                >
                  <option value="">
                    Select a {form.targetType}...
                  </option>
                  {currentOptions.map((opt) => (
                    <option
                      key={opt.id}
                      value={opt.id}
                      disabled={!opt.isPublished}
                      className={opt.isPublished ? "" : "text-neutral-400"}
                    >
                      {opt.title}{!opt.isPublished ? " (draft)" : ""}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Row 2: Label + URL (always editable for overrides) */}
            <div className="flex gap-3">
              <input
                value={form.label}
                onChange={(e) => setForm((prev) => ({ ...prev, label: e.target.value }))}
                placeholder="Label"
                required
                className="rounded border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none"
              />
              <input
                value={form.url}
                onChange={(e) => setForm((prev) => ({ ...prev, url: e.target.value }))}
                placeholder={isLinkType ? "Auto-filled from selection" : "URL (e.g. https://example.com)"}
                required
                className="flex-1 rounded border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none"
              />
            </div>

            {/* Row 3: Actions */}
            <div className="flex gap-3">
              <button
                type="submit"
                className="btn-primary"
              >
                {editingId ? "Update" : "Add"}
              </button>
              <button
                type="button"
                onClick={() => { setShowForm(false); setEditingId(null); setForm(emptyForm); }}
                className="btn-secondary"
              >
                Cancel
              </button>
            </div>
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
                        onClick={() => openEditForm(item)}
                        className="btn-text"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="btn-danger"
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
