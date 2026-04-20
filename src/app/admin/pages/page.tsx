"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { DndContext, closestCenter } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { Plus, X } from "lucide-react";
import { SortableItem } from "@/components/admin/SortableItem";
import { useSortableList } from "@/lib/hooks/useSortableList";
import { useMessage } from "@/lib/hooks/useMessage";
import {
  Button,
  Card,
  Field,
  Input,
  Pill,
  SectionLabel,
  Select,
  Textarea,
  Topbar,
} from "@/components/admin/ui";

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
    if (res.ok) setHomepageId(newId);
    else showError("Failed to update homepage.");
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
      showError("Failed to create page.");
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
      showSuccess("Page updated.");
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
      showSuccess("Page duplicated.");
      fetchPages();
    } else {
      showError("Failed to duplicate.");
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this page?")) return;
    const res = await fetch(`/api/pages?id=${id}`, { method: "DELETE" });
    if (res.ok) {
      showSuccess("Page deleted.");
      fetchPages();
    } else {
      showError("Failed to delete.");
    }
  }

  async function togglePublish(page: Page) {
    const res = await fetch("/api/pages", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: page.id, isPublished: !page.isPublished }),
    });
    if (res.ok) fetchPages();
    else showError("Failed to update.");
  }

  const editingPage = pages.find((p) => p.id === editMeta);

  return (
    <div className="-m-8 min-h-[calc(100vh-0px)] bg-admin-bg">
      <Topbar
        title="Pages"
        subtitle={`${pages.length} total · drag to reorder`}
        actions={
          <Button
            kind="primary"
            onClick={() => {
              setShowNewForm(true);
              setEditMeta(null);
            }}
            icon={<Plus className="h-3.5 w-3.5" />}
          >
            New page
          </Button>
        }
      />

      <div className="p-7 space-y-4">
        {message && <div className={alertClass}>{message.text}</div>}

        {showNewForm && (
          <Card
            header={
              <>
                <SectionLabel>New page</SectionLabel>
                <button
                  onClick={() => setShowNewForm(false)}
                  className="p-1 text-admin-ink-soft hover:text-admin-ink"
                  aria-label="Close"
                >
                  <X className="h-4 w-4" />
                </button>
              </>
            }
          >
            <form onSubmit={handleCreate} className="space-y-4">
              <Field label="Title" htmlFor="np-title">
                <Input
                  id="np-title"
                  name="title"
                  placeholder="Page title"
                  required
                  autoFocus
                />
              </Field>
              <Field label="Type" htmlFor="np-type">
                <Select id="np-type" name="pageType" defaultValue="custom">
                  <option value="custom">Custom</option>
                  <option value="about">About</option>
                  <option value="contact">Contact</option>
                </Select>
              </Field>
              <div className="flex gap-2">
                <Button type="submit" kind="primary">
                  Create &amp; edit
                </Button>
                <Button
                  type="button"
                  kind="ghost"
                  onClick={() => setShowNewForm(false)}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </Card>
        )}

        {editMeta && editingPage && (
          <Card
            header={
              <>
                <SectionLabel>Page settings</SectionLabel>
                <button
                  onClick={() => setEditMeta(null)}
                  className="p-1 text-admin-ink-soft hover:text-admin-ink"
                  aria-label="Close"
                >
                  <X className="h-4 w-4" />
                </button>
              </>
            }
          >
            <form onSubmit={handleUpdateMeta} className="space-y-4">
              <Field label="Title" htmlFor="ep-title">
                <Input
                  id="ep-title"
                  name="title"
                  defaultValue={editingPage.title}
                  required
                />
              </Field>
              <Field label="Type" htmlFor="ep-type">
                <Select
                  id="ep-type"
                  name="pageType"
                  defaultValue={editingPage.pageType}
                >
                  <option value="custom">Custom</option>
                  <option value="about">About</option>
                  <option value="contact">Contact</option>
                </Select>
              </Field>
              <label className="flex items-center gap-2 text-[13px] text-admin-ink cursor-pointer">
                <input
                  type="checkbox"
                  name="showTitle"
                  defaultChecked={editingPage.showTitle}
                  className="accent-admin-accent"
                />
                Show page title
              </label>
              <details className="rounded-md border border-admin-border p-3">
                <summary className="cursor-pointer text-[13px] font-medium text-admin-ink-soft">
                  SEO settings
                </summary>
                <div className="mt-3 space-y-4">
                  <Field label="Meta title" htmlFor="ep-meta-title">
                    <Input
                      id="ep-meta-title"
                      name="metaTitle"
                      defaultValue={editingPage.metaTitle ?? ""}
                      placeholder="Optional"
                    />
                  </Field>
                  <Field label="Meta description" htmlFor="ep-meta-desc">
                    <Textarea
                      id="ep-meta-desc"
                      name="metaDescription"
                      defaultValue={editingPage.metaDescription ?? ""}
                      rows={2}
                      placeholder="Optional"
                    />
                  </Field>
                </div>
              </details>
              <div className="flex gap-2">
                <Button type="submit" kind="primary">
                  Save settings
                </Button>
                <Button
                  type="button"
                  kind="ghost"
                  onClick={() => setEditMeta(null)}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </Card>
        )}

        {loading ? (
          <div className="text-admin-ink-soft">Loading...</div>
        ) : pages.length === 0 ? (
          <EmptyState
            title="No pages yet"
            body="Create one to get started."
          />
        ) : (
          <Card padded={false}>
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={pages.map((p) => p.id)}
                strategy={verticalListSortingStrategy}
              >
                {pages.map((page) => (
                  <SortableItem key={page.id} id={page.id}>
                    <div className="flex items-center justify-between gap-3 border-b border-admin-border px-4 py-3 last:border-0">
                      <div className="min-w-0 flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-admin-ink truncate">
                          {page.title}
                        </span>
                        <span className="text-[12px] text-admin-ink-soft truncate">
                          /{page.slug}
                        </span>
                        {page.pageType !== "custom" && (
                          <Pill>{page.pageType}</Pill>
                        )}
                        <Pill tone={page.isPublished ? "success" : "neutral"}>
                          {page.isPublished ? "Published" : "Draft"}
                        </Pill>
                        {homepageId === page.id && (
                          <Pill tone="warn">Home</Pill>
                        )}
                      </div>
                      <div className="flex shrink-0 items-center gap-1.5">
                        <Button
                          kind="subtle"
                          size="sm"
                          onClick={() => handleSetHomepage(page.id)}
                        >
                          {homepageId === page.id
                            ? "Unset homepage"
                            : "Set as homepage"}
                        </Button>
                        <Button
                          kind="subtle"
                          size="sm"
                          onClick={() => togglePublish(page)}
                        >
                          {page.isPublished ? "Unpublish" : "Publish"}
                        </Button>
                        <Button
                          kind="ghost"
                          size="sm"
                          onClick={() =>
                            router.push(`/admin/pages/${page.id}/edit`)
                          }
                        >
                          Edit content
                        </Button>
                        <Button
                          kind="ghost"
                          size="sm"
                          onClick={() => {
                            setEditMeta(page.id);
                            setShowNewForm(false);
                          }}
                        >
                          Settings
                        </Button>
                        <Button
                          kind="subtle"
                          size="sm"
                          onClick={() => handleDuplicate(page.id)}
                        >
                          Duplicate
                        </Button>
                        <Button
                          kind="danger"
                          size="sm"
                          onClick={() => handleDelete(page.id)}
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
