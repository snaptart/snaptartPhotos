"use client";

import { useEffect, useState, useCallback } from "react";
import {
  DndContext,
  closestCenter,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { SortableItem } from "@/components/admin/SortableItem";
import { useSortableList } from "@/lib/hooks/useSortableList";
import { useMessage } from "@/lib/hooks/useMessage";
import Link from "next/link";
import siteConfig from "@/lib/site.config";

interface Gallery {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  coverImageUrl: string | null;
  parentId: string | null;
  position: number;
  isPublished: boolean;
}

export default function GalleriesPage() {
  const [galleries, setGalleries] = useState<Gallery[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const { message, showSuccess, showError, alertClass } = useMessage();

  const { sensors, handleDragEnd } = useSortableList({
    items: galleries,
    setItems: setGalleries,
    endpoint: "/api/galleries",
    onError: showError,
  });

  const fetchGalleries = useCallback(async () => {
    const res = await fetch("/api/galleries");
    const data = await res.json();
    setGalleries(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchGalleries();
  }, [fetchGalleries]);

  async function handleAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);

    const res = await fetch("/api/galleries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: form.get("title"),
        description: form.get("description") || null,
        isPublished: form.get("isPublished") === "on",
        position: galleries.length,
      }),
    });

    if (res.ok) {
      setShowForm(false);
      showSuccess(`${siteConfig.labels.gallery} created!`);
      fetchGalleries();
    } else {
      showError(`Failed to create ${siteConfig.labels.gallery.toLowerCase()}`);
    }
  }

  async function handleUpdate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);

    const res = await fetch("/api/galleries", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: editingId,
        title: form.get("title"),
        description: form.get("description") || null,
        isPublished: form.get("isPublished") === "on",
      }),
    });

    if (res.ok) {
      setEditingId(null);
      showSuccess(`${siteConfig.labels.gallery} updated!`);
      fetchGalleries();
    }
  }

  async function handleDelete(id: string) {
    if (!confirm(`Delete this ${siteConfig.labels.gallery.toLowerCase()} and all its ${siteConfig.labels.photos.toLowerCase()}?`)) return;
    const res = await fetch(`/api/galleries?id=${id}`, { method: "DELETE" });
    if (res.ok) {
      showSuccess(`${siteConfig.labels.gallery} deleted`);
      fetchGalleries();
    } else {
      showError(`Failed to delete ${siteConfig.labels.gallery.toLowerCase()}`);
    }
  }

  async function togglePublish(gallery: Gallery) {
    const res = await fetch("/api/galleries", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: gallery.id, isPublished: !gallery.isPublished }),
    });
    if (res.ok) {
      fetchGalleries();
    } else {
      showError(`Failed to update ${siteConfig.labels.gallery.toLowerCase()}`);
    }
  }

  if (loading) return <div className="text-neutral-500">Loading...</div>;

  const editingGallery = galleries.find((g) => g.id === editingId);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{siteConfig.labels.galleries}</h1>
        <button
          onClick={() => { setShowForm(true); setEditingId(null); }}
          className="btn-primary"
        >
          New {siteConfig.labels.gallery}
        </button>
      </div>

      {message && (
        <div className={alertClass}>
          {message.text}
        </div>
      )}

      {(showForm || editingId) && (
        <form
          onSubmit={editingId ? handleUpdate : handleAdd}
          className="mb-6 rounded-lg border border-neutral-200 bg-white p-4"
        >
          <h2 className="mb-3 text-sm font-medium">
            {editingId ? `Edit ${siteConfig.labels.gallery}` : `New ${siteConfig.labels.gallery}`}
          </h2>
          <div className="space-y-3">
            <input
              name="title"
              placeholder={`${siteConfig.labels.gallery} title`}
              defaultValue={editingGallery?.title ?? ""}
              required
              className="input-base"
            />
            <textarea
              name="description"
              placeholder="Description (optional)"
              defaultValue={editingGallery?.description ?? ""}
              rows={2}
              className="input-base"
            />
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="isPublished"
                defaultChecked={editingGallery?.isPublished ?? false}
              />
              Published
            </label>
            <div className="flex gap-2">
              <button type="submit" className="btn-primary">
                {editingId ? "Update" : "Create"}
              </button>
              <button
                type="button"
                onClick={() => { setShowForm(false); setEditingId(null); }}
                className="btn-secondary"
              >
                Cancel
              </button>
            </div>
          </div>
        </form>
      )}

      {galleries.length === 0 ? (
        <p className="text-sm text-neutral-500">No {siteConfig.labels.galleries.toLowerCase()} yet. Create one to get started.</p>
      ) : (
        <div className="rounded-lg border border-neutral-200 bg-white">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={galleries.map((g) => g.id)} strategy={verticalListSortingStrategy}>
              {galleries.map((gallery) => (
                <SortableItem key={gallery.id} id={gallery.id}>
                  <div className="flex items-center justify-between border-b border-neutral-100 px-4 py-3 last:border-0">
                    <div className="flex items-center gap-3">
                      {gallery.coverImageUrl ? (
                        <img
                          src={gallery.coverImageUrl}
                          alt=""
                          className="h-10 w-10 rounded object-cover"
                        />
                      ) : (
                        <div className="flex h-10 w-10 items-center justify-center rounded bg-neutral-100 text-neutral-400 text-xs">
                          No img
                        </div>
                      )}
                      <div>
                        <span className="font-medium">{gallery.title}</span>
                        <span className="ml-2 text-sm text-neutral-400">/{gallery.slug}</span>
                        <span
                          className={`ml-2 rounded px-1.5 py-0.5 text-xs ${
                            gallery.isPublished
                              ? "bg-green-50 text-green-600"
                              : "bg-neutral-100 text-neutral-500"
                          }`}
                        >
                          {gallery.isPublished ? "Published" : "Draft"}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Link
                        href={`/admin/photos?galleryId=${gallery.id}`}
                        className="btn-text"
                      >
                        {siteConfig.labels.photos}
                      </Link>
                      <button onClick={() => togglePublish(gallery)} className="btn-text">
                        {gallery.isPublished ? "Unpublish" : "Publish"}
                      </button>
                      <button
                        onClick={() => { setEditingId(gallery.id); setShowForm(false); }}
                        className="btn-text"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(gallery.id)}
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
