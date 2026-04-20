"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { DndContext, closestCenter } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { Plus, X } from "lucide-react";
import { SortableItem } from "@/components/admin/SortableItem";
import { useSortableList } from "@/lib/hooks/useSortableList";
import { useMessage } from "@/lib/hooks/useMessage";
import siteConfig from "@/lib/site.config";
import {
  Button,
  Card,
  Field,
  Input,
  Pill,
  SectionLabel,
  Textarea,
  Topbar,
} from "@/components/admin/ui";

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
      showSuccess(`${siteConfig.labels.gallery} created.`);
      fetchGalleries();
    } else {
      showError(`Failed to create ${siteConfig.labels.gallery.toLowerCase()}.`);
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
      showSuccess(`${siteConfig.labels.gallery} updated.`);
      fetchGalleries();
    }
  }

  async function handleDelete(id: string) {
    if (
      !confirm(
        `Delete this ${siteConfig.labels.gallery.toLowerCase()} and all its ${siteConfig.labels.photos.toLowerCase()}?`,
      )
    )
      return;
    const res = await fetch(`/api/galleries?id=${id}`, { method: "DELETE" });
    if (res.ok) {
      showSuccess(`${siteConfig.labels.gallery} deleted.`);
      fetchGalleries();
    } else {
      showError(`Failed to delete.`);
    }
  }

  async function togglePublish(gallery: Gallery) {
    const res = await fetch("/api/galleries", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: gallery.id, isPublished: !gallery.isPublished }),
    });
    if (res.ok) fetchGalleries();
    else showError("Failed to update.");
  }

  const editingGallery = galleries.find((g) => g.id === editingId);
  const isFormOpen = showForm || !!editingId;

  return (
    <div className="-m-8 min-h-[calc(100vh-0px)] bg-admin-bg">
      <Topbar
        title={siteConfig.labels.galleries}
        subtitle={`${galleries.length} total · drag to reorder`}
        actions={
          <Button
            kind="primary"
            onClick={() => {
              setShowForm(true);
              setEditingId(null);
            }}
            icon={<Plus className="h-3.5 w-3.5" />}
          >
            New {siteConfig.labels.gallery.toLowerCase()}
          </Button>
        }
      />

      <div className="p-7 space-y-4">
        {message && (
          <div className={alertClass}>{message.text}</div>
        )}

        {isFormOpen && (
          <Card
            header={
              <>
                <SectionLabel>
                  {editingId
                    ? `Edit ${siteConfig.labels.gallery.toLowerCase()}`
                    : `New ${siteConfig.labels.gallery.toLowerCase()}`}
                </SectionLabel>
                <button
                  onClick={() => {
                    setShowForm(false);
                    setEditingId(null);
                  }}
                  className="p-1 text-admin-ink-soft hover:text-admin-ink"
                  aria-label="Close form"
                >
                  <X className="h-4 w-4" />
                </button>
              </>
            }
          >
            <form
              onSubmit={editingId ? handleUpdate : handleAdd}
              className="space-y-4"
            >
              <Field label="Title" htmlFor="g-title">
                <Input
                  id="g-title"
                  name="title"
                  defaultValue={editingGallery?.title ?? ""}
                  placeholder={`${siteConfig.labels.gallery} title`}
                  required
                />
              </Field>
              <Field label="Description" htmlFor="g-description">
                <Textarea
                  id="g-description"
                  name="description"
                  defaultValue={editingGallery?.description ?? ""}
                  placeholder="Optional"
                  rows={2}
                />
              </Field>
              <label className="flex items-center gap-2 text-[13px] text-admin-ink cursor-pointer">
                <input
                  type="checkbox"
                  name="isPublished"
                  defaultChecked={editingGallery?.isPublished ?? false}
                  className="accent-admin-accent"
                />
                Published
              </label>
              <div className="flex gap-2">
                <Button type="submit" kind="primary">
                  {editingId ? "Update" : "Create"}
                </Button>
                <Button
                  type="button"
                  kind="ghost"
                  onClick={() => {
                    setShowForm(false);
                    setEditingId(null);
                  }}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </Card>
        )}

        {loading ? (
          <div className="text-admin-ink-soft">Loading...</div>
        ) : galleries.length === 0 ? (
          <EmptyState
            title={`No ${siteConfig.labels.galleries.toLowerCase()} yet`}
            body={`Create one to get started.`}
          />
        ) : (
          <Card padded={false}>
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={galleries.map((g) => g.id)}
                strategy={verticalListSortingStrategy}
              >
                {galleries.map((gallery) => (
                  <SortableItem key={gallery.id} id={gallery.id}>
                    <div className="flex items-center justify-between gap-4 border-b border-admin-border px-4 py-3 last:border-0">
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="relative h-11 w-11 flex-shrink-0 overflow-hidden rounded-md bg-admin-surface-2 border border-admin-border">
                          {gallery.coverImageUrl && (
                            <Image
                              src={gallery.coverImageUrl}
                              alt=""
                              fill
                              sizes="44px"
                              className="object-cover"
                            />
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="truncate font-medium text-admin-ink">
                              {gallery.title}
                            </span>
                            <Pill
                              tone={gallery.isPublished ? "success" : "neutral"}
                            >
                              {gallery.isPublished ? "Published" : "Draft"}
                            </Pill>
                          </div>
                          <div className="text-[12px] text-admin-ink-soft truncate">
                            /{gallery.slug}
                            {gallery.description && ` · ${gallery.description}`}
                          </div>
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <Link
                          href={`/admin/photos?galleryId=${gallery.id}`}
                          className="text-[12px] text-admin-ink-soft hover:text-admin-ink"
                        >
                          {siteConfig.labels.photos}
                        </Link>
                        <Button
                          kind="subtle"
                          size="sm"
                          onClick={() => togglePublish(gallery)}
                        >
                          {gallery.isPublished ? "Unpublish" : "Publish"}
                        </Button>
                        <Button
                          kind="ghost"
                          size="sm"
                          onClick={() => {
                            setEditingId(gallery.id);
                            setShowForm(false);
                          }}
                        >
                          Edit
                        </Button>
                        <Button
                          kind="danger"
                          size="sm"
                          onClick={() => handleDelete(gallery.id)}
                        >
                          Delete
                        </Button>
                      </div>
                    </div>
                  </SortableItem>
                ))}
              </SortableContext>
            </DndContext>
          </Card>
        )}
      </div>
    </div>
  );
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="font-serif italic text-[22px] text-admin-ink mb-2">
        {title}
      </div>
      <p className="text-[13px] text-admin-ink-soft max-w-sm">{body}</p>
    </div>
  );
}
