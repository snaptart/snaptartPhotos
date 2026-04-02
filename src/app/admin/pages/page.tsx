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
import { useRouter } from "next/navigation";

interface Page {
  id: string;
  title: string;
  slug: string;
  pageType: string;
  showTitle: boolean;
  isPublished: boolean;
  position: number;
  metaTitle: string | null;
  metaDescription: string | null;
}

export default function PagesPage() {
  const [pages, setPages] = useState<Page[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewForm, setShowNewForm] = useState(false);
  const [editMeta, setEditMeta] = useState<string | null>(null);
  const [homepageId, setHomepageId] = useState<string | null>(null);
  const { message, showSuccess, showError, alertClass } = useMessage();
  const router = useRouter();

  const { sensors, handleDragEnd } = useSortableList({
    items: pages,
    setItems: setPages,
    endpoint: "/api/pages",
    onError: showError,
  });

  const fetchPages = useCallback(async () => {
    const [pagesRes, settingsRes] = await Promise.all([
      fetch("/api/pages"),
      fetch("/api/settings"),
    ]);
    const data = await pagesRes.json();
    const settings = await settingsRes.json();
    setPages(data);
    setHomepageId(settings?.homepageId ?? null);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchPages();
  }, [fetchPages]);

  async function handleSetHomepage(id: string) {
    const newId = homepageId === id ? null : id;
    const res = await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ homepageId: newId }),
    });
    if (res.ok) {
      setHomepageId(newId);
    } else {
      showError("Failed to update homepage");
    }
  }

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);

    const res = await fetch("/api/pages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: form.get("title"),
        pageType: form.get("pageType"),
        position: pages.length,
      }),
    });

    if (res.ok) {
      const page = await res.json();
      router.push(`/admin/pages/${page.id}/edit`);
    } else {
      showError("Failed to create page");
    }
  }

  async function handleUpdateMeta(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);

    const res = await fetch("/api/pages", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: editMeta,
        title: form.get("title"),
        pageType: form.get("pageType"),
        showTitle: form.get("showTitle") === "on",
        metaTitle: form.get("metaTitle") || null,
        metaDescription: form.get("metaDescription") || null,
      }),
    });

    if (res.ok) {
      setEditMeta(null);
      showSuccess("Page updated!");
      fetchPages();
    }
  }

  async function handleDuplicate(id: string) {
    const res = await fetch("/api/pages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ duplicateId: id, position: pages.length }),
    });
    if (res.ok) {
      showSuccess("Page duplicated!");
      fetchPages();
    } else {
      showError("Failed to duplicate page");
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this page?")) return;
    const res = await fetch(`/api/pages?id=${id}`, { method: "DELETE" });
    if (res.ok) {
      showSuccess("Page deleted");
      fetchPages();
    } else {
      showError("Failed to delete page");
    }
  }

  async function togglePublish(page: Page) {
    const res = await fetch("/api/pages", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: page.id, isPublished: !page.isPublished }),
    });
    if (res.ok) {
      fetchPages();
    } else {
      showError("Failed to update page");
    }
  }

  if (loading) return <div className="text-neutral-500">Loading...</div>;

  const editingPage = pages.find((p) => p.id === editMeta);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Pages</h1>
        <button onClick={() => setShowNewForm(true)} className="btn-primary">
          New Page
        </button>
      </div>

      {message && (
        <div className={alertClass}>
          {message.text}
        </div>
      )}

      {/* New page form */}
      {showNewForm && (
        <form
          onSubmit={handleCreate}
          className="mb-6 rounded-lg border border-neutral-200 bg-white p-4"
        >
          <h2 className="mb-3 text-sm font-medium">New Page</h2>
          <div className="space-y-3">
            <input
              name="title"
              placeholder="Page title"
              required
              autoFocus
              className="input-base"
            />
            <select name="pageType" defaultValue="custom" className="input-base">
              <option value="custom">Custom</option>
              <option value="about">About</option>
              <option value="contact">Contact</option>
            </select>
            <div className="flex gap-2">
              <button type="submit" className="btn-primary">Create &amp; Edit</button>
              <button type="button" onClick={() => setShowNewForm(false)} className="btn-secondary">
                Cancel
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Edit metadata form */}
      {editMeta && editingPage && (
        <form
          onSubmit={handleUpdateMeta}
          className="mb-6 rounded-lg border border-neutral-200 bg-white p-4"
        >
          <h2 className="mb-3 text-sm font-medium">Edit Page Settings</h2>
          <div className="space-y-3">
            <input
              name="title"
              placeholder="Page title"
              defaultValue={editingPage.title}
              required
              className="input-base"
            />
            <select name="pageType" defaultValue={editingPage.pageType} className="input-base">
              <option value="custom">Custom</option>
              <option value="about">About</option>
              <option value="contact">Contact</option>
            </select>
            <label className="flex items-center gap-2 text-sm text-neutral-700">
              <input
                type="checkbox"
                name="showTitle"
                defaultChecked={editingPage.showTitle}
                className="rounded border-neutral-300"
              />
              Show page title
            </label>
            <details className="rounded border border-neutral-200 p-3">
              <summary className="cursor-pointer text-sm font-medium text-neutral-600">SEO Settings</summary>
              <div className="mt-3 space-y-3">
                <input
                  name="metaTitle"
                  placeholder="Meta title (optional)"
                  defaultValue={editingPage.metaTitle ?? ""}
                  className="input-base"
                />
                <textarea
                  name="metaDescription"
                  placeholder="Meta description (optional)"
                  defaultValue={editingPage.metaDescription ?? ""}
                  rows={2}
                  className="input-base"
                />
              </div>
            </details>
            <div className="flex gap-2">
              <button type="submit" className="btn-primary">Save Settings</button>
              <button type="button" onClick={() => setEditMeta(null)} className="btn-secondary">
                Cancel
              </button>
            </div>
          </div>
        </form>
      )}

      {pages.length === 0 ? (
        <p className="text-sm text-neutral-500">No pages yet. Create one to get started.</p>
      ) : (
        <div className="rounded-lg border border-neutral-200 bg-white">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={pages.map((p) => p.id)} strategy={verticalListSortingStrategy}>
              {pages.map((page) => (
                <SortableItem key={page.id} id={page.id}>
                  <div className="flex items-center justify-between border-b border-neutral-100 px-4 py-3 last:border-0">
                    <div className="flex items-center gap-3">
                      <div>
                        <span className="font-medium">{page.title}</span>
                        <span className="ml-2 text-sm text-neutral-400">/{page.slug}</span>
                        <span className={`ml-2 rounded px-1.5 py-0.5 text-xs ${
                          page.pageType !== "custom"
                            ? "bg-blue-50 text-blue-600"
                            : "bg-neutral-50 text-neutral-400"
                        }`}>
                          {page.pageType}
                        </span>
                        <span
                          className={`ml-2 rounded px-1.5 py-0.5 text-xs ${
                            page.isPublished
                              ? "bg-green-50 text-green-600"
                              : "bg-neutral-100 text-neutral-500"
                          }`}
                        >
                          {page.isPublished ? "Published" : "Draft"}
                        </span>
                        {homepageId === page.id && (
                          <span className="ml-2 rounded bg-amber-50 px-1.5 py-0.5 text-xs text-amber-600">
                            Home
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleSetHomepage(page.id)}
                        className={homepageId === page.id ? "rounded border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs text-amber-600 transition-colors hover:bg-amber-100 hover:text-amber-800" : "btn-text"}
                      >
                        {homepageId === page.id ? "Unset Homepage" : "Set as Homepage"}
                      </button>
                      <button onClick={() => togglePublish(page)} className="btn-text">
                        {page.isPublished ? "Unpublish" : "Publish"}
                      </button>
                      <button
                        onClick={() => router.push(`/admin/pages/${page.id}/edit`)}
                        className="btn-text"
                      >
                        Edit Content
                      </button>
                      <button
                        onClick={() => { setEditMeta(page.id); setShowNewForm(false); }}
                        className="btn-text"
                      >
                        Settings
                      </button>
                      <button
                        onClick={() => handleDuplicate(page.id)}
                        className="btn-text"
                      >
                        Duplicate
                      </button>
                      <button
                        onClick={() => handleDelete(page.id)}
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
