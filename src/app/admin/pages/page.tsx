"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { DndContext, closestCenter } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { Copy, ExternalLink, Eye, EyeOff, History, Home, Plus, Trash2 } from "lucide-react";
import { SortableItem } from "@/components/admin/SortableItem";
import ImagePicker from "@/components/admin/ImagePicker";
import { PageHistoryDrawer } from "@/components/admin/PageHistoryDrawer";
import { useSortableList } from "@/lib/hooks/useSortableList";
import { useMessage } from "@/lib/hooks/useMessage";
import {
  Button,
  Card,
  Drawer,
  EmptyState,
  Field,
  Input,
  Pill,
  RowMenu,
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
  isFullBleed: boolean;
  isPublished: boolean;
  position: number;
  metaTitle: string | null;
  metaDescription: string | null;
  ogImageUrl: string | null;
}

const TYPE_OPTIONS = (
  <>
    <option value="custom">Custom</option>
    <option value="about">About</option>
    <option value="contact">Contact</option>
  </>
);

export default function PagesPage() {
  const [pages, setPages] = useState<Page[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewForm, setShowNewForm] = useState(false);
  const [editMeta, setEditMeta] = useState<string | null>(null);
  const [homepageId, setHomepageId] = useState<string | null>(null);
  const [historyFor, setHistoryFor] = useState<Page | null>(null);
  const [ogImage, setOgImage] = useState("");
  const [metaError, setMetaError] = useState<string | null>(null);
  // Pages that share a gallery's slug are that collection's page.
  const [collectionSlugs, setCollectionSlugs] = useState<Set<string>>(new Set());
  const { message, showSuccess, showError, alertClass } = useMessage();
  const router = useRouter();

  const { sensors, handleDragEnd } = useSortableList({
    items: pages,
    setItems: setPages,
    endpoint: "/api/pages",
    onError: showError,
  });

  const fetchPages = useCallback(async () => {
    const [pagesRes, settingsRes, galleriesRes] = await Promise.all([
      fetch("/api/pages"),
      fetch("/api/settings"),
      fetch("/api/galleries"),
    ]);
    const data = await pagesRes.json();
    const settings = await settingsRes.json();
    const galleries: { slug: string }[] = galleriesRes.ok ? await galleriesRes.json() : [];
    setPages(data);
    setHomepageId(settings?.homepageId ?? null);
    setCollectionSlugs(new Set(galleries.map((g) => g.slug)));
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
        isFullBleed: form.get("isFullBleed") === "on",
        metaTitle: form.get("metaTitle") || null,
        metaDescription: form.get("metaDescription") || null,
        ogImageUrl: ogImage || null,
        slug: form.get("slug"),
      }),
    });
    if (res.ok) {
      setEditMeta(null);
      showSuccess("Page updated.");
      fetchPages();
    } else {
      const data = await res.json().catch(() => ({}));
      setMetaError(data.error || "Failed to save.");
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

  async function handleDelete(page: Page) {
    if (!confirm(`Delete "${page.title}"? This can't be undone.`)) return;
    const res = await fetch(`/api/pages?id=${page.id}`, { method: "DELETE" });
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
  const publicPath = (page: Page) => (homepageId === page.id ? "/" : `/${page.slug}`);

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
                        <button
                          type="button"
                          onClick={() => router.push(`/admin/pages/${page.id}/edit`)}
                          className="font-medium text-admin-ink truncate hover:underline"
                        >
                          {page.title}
                        </button>
                        <a
                          href={publicPath(page)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[12px] text-admin-ink-soft hover:text-admin-ink"
                          title="Open the page on the site"
                        >
                          {publicPath(page)}
                          <ExternalLink className="h-3 w-3" />
                        </a>
                        {homepageId === page.id && <Pill tone="warn">Homepage</Pill>}
                        {collectionSlugs.has(page.slug) && (
                          <Pill tone="accent" title="This page is the collection's page">
                            Collection
                          </Pill>
                        )}
                        {page.pageType !== "custom" && <Pill>{page.pageType}</Pill>}
                        {!page.isPublished && <Pill>Draft</Pill>}
                      </div>
                      <div className="flex shrink-0 items-center gap-1.5">
                        <Button
                          kind="ghost"
                          size="sm"
                          onClick={() => router.push(`/admin/pages/${page.id}/edit`)}
                        >
                          Edit content
                        </Button>
                        <Button
                          kind="ghost"
                          size="sm"
                          onClick={() => {
                            setEditMeta(page.id);
                            setOgImage(page.ogImageUrl ?? "");
                            setMetaError(null);
                            setShowNewForm(false);
                          }}
                        >
                          Settings
                        </Button>
                        <RowMenu
                          items={[
                            { label: "View on site", icon: <ExternalLink className="h-3.5 w-3.5" />, href: publicPath(page), external: true },
                            { label: "Duplicate", icon: <Copy className="h-3.5 w-3.5" />, onSelect: () => handleDuplicate(page.id) },
                            { label: "History…", icon: <History className="h-3.5 w-3.5" />, onSelect: () => setHistoryFor(page) },
                            {
                              label: homepageId === page.id ? "Stop using as homepage" : "Use as homepage",
                              icon: <Home className="h-3.5 w-3.5" />,
                              onSelect: () => handleSetHomepage(page.id),
                            },
                            {
                              label: page.isPublished ? "Unpublish" : "Publish",
                              icon: page.isPublished ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />,
                              onSelect: () => togglePublish(page),
                            },
                            "divider",
                            { label: "Delete…", icon: <Trash2 className="h-3.5 w-3.5" />, danger: true, onSelect: () => handleDelete(page) },
                          ]}
                        />
                      </div>
                    </div>
                  </SortableItem>
                ))}
              </SortableContext>
            </DndContext>
          </Card>
        )}
      </div>

      <Drawer
        open={showNewForm}
        onClose={() => setShowNewForm(false)}
        eyebrow="New page"
        title="Create a page"
        footer={
          <>
            <Button type="submit" form="new-page-form" kind="primary">
              Create &amp; edit
            </Button>
            <Button type="button" kind="ghost" onClick={() => setShowNewForm(false)}>
              Cancel
            </Button>
          </>
        }
      >
        <form id="new-page-form" onSubmit={handleCreate} className="space-y-4">
          <Field label="Title" htmlFor="np-title">
            <Input id="np-title" name="title" placeholder="Page title" required />
          </Field>
          <Field label="Type" htmlFor="np-type">
            <Select id="np-type" name="pageType" defaultValue="custom">
              {TYPE_OPTIONS}
            </Select>
          </Field>
          <p className="text-[12px] text-admin-ink-soft">
            To make a collection&apos;s page, give the page the collection&apos;s name: its address then matches the
            collection, and the site links there.
          </p>
        </form>
      </Drawer>

      <Drawer
        open={!!editingPage}
        onClose={() => setEditMeta(null)}
        eyebrow="Page settings"
        title={editingPage?.title ?? ""}
        footer={
          <>
            <Button type="submit" form="page-settings-form" kind="primary">
              Save settings
            </Button>
            <Button type="button" kind="ghost" onClick={() => setEditMeta(null)}>
              Cancel
            </Button>
          </>
        }
      >
        {editingPage && (
          <form id="page-settings-form" key={editingPage.id} onSubmit={handleUpdateMeta} className="space-y-4">
            {metaError && <div className="text-[13px] text-admin-danger">{metaError}</div>}
            <Field label="Title" htmlFor="ep-title">
              <Input id="ep-title" name="title" defaultValue={editingPage.title} required />
            </Field>
            <Field
              label="Address"
              htmlFor="ep-slug"
              hint={
                <>
                  {homepageId === editingPage.id && "This is the homepage, so visitors see it at “/” too. "}
                  {collectionSlugs.has(editingPage.slug) &&
                    "This address makes it its collection’s page; changing it unlinks the two. "}
                  {editingPage.isPublished
                    ? "Changing it breaks links and bookmarks that use the old address."
                    : "Lowercase letters, numbers and dashes."}
                </>
              }
            >
              <div className="flex items-center gap-1.5">
                <span className="text-[13px] text-admin-ink-soft">/</span>
                <Input id="ep-slug" name="slug" defaultValue={editingPage.slug} required />
              </div>
            </Field>
            <Field label="Type" htmlFor="ep-type">
              <Select id="ep-type" name="pageType" defaultValue={editingPage.pageType}>
                {TYPE_OPTIONS}
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
            <label className="flex items-start gap-2 text-[13px] text-admin-ink cursor-pointer">
              <input
                type="checkbox"
                name="isFullBleed"
                defaultChecked={editingPage.isFullBleed}
                className="mt-0.5 accent-admin-accent"
              />
              <span>
                Full bleed
                <span className="block text-[12px] text-admin-ink-soft">
                  Drops the centered max-width wrapper — for big blocks like Field Map.
                </span>
              </span>
            </label>
            <div className="space-y-4 border-t border-admin-border pt-4">
              <div className="font-mono text-[10px] uppercase tracking-[2px] text-admin-ink-soft">Search engines</div>
              <Field label="Meta title" htmlFor="ep-meta-title">
                <Input
                  id="ep-meta-title"
                  name="metaTitle"
                  defaultValue={editingPage.metaTitle ?? ""}
                  placeholder={editingPage.title}
                />
              </Field>
              <Field label="Meta description" htmlFor="ep-meta-desc">
                <Textarea
                  id="ep-meta-desc"
                  name="metaDescription"
                  defaultValue={editingPage.metaDescription ?? ""}
                  rows={3}
                  placeholder="Optional"
                />
              </Field>
              <Field
                label="Share image"
                hint="Shown when a link to this page is shared. Without one, the site’s share image (Settings → Identity) is used."
              >
                <ImagePicker value={ogImage} onChange={setOgImage} />
              </Field>
            </div>
          </form>
        )}
      </Drawer>

      <PageHistoryDrawer page={historyFor} onClose={() => setHistoryFor(null)} onRestored={fetchPages} />
    </div>
  );
}
