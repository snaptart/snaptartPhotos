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
import { CURATED_FONTS } from "@/lib/theme/fonts";

interface StoryTypography {
  fontHeadings?: string;
  fontBody?: string;
  bodyFontSize?: "small" | "medium" | "large";
}

interface Story {
  id: string;
  title: string;
  slug: string;
  showTitle: boolean;
  isPublished: boolean;
  isPasswordProtected: boolean;
  position: number;
  metaTitle: string | null;
  metaDescription: string | null;
  typography: StoryTypography | null;
}

const SERIF_FONTS = CURATED_FONTS.filter((f) => f.category === "serif");
const SANS_FONTS = CURATED_FONTS.filter((f) => f.category === "sans-serif");
const DISPLAY_FONTS = CURATED_FONTS.filter((f) => f.category === "display");

export default function StoriesPage() {
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewForm, setShowNewForm] = useState(false);
  const [editSettings, setEditSettings] = useState<string | null>(null);
  const { message, showSuccess, showError, alertClass } = useMessage();
  const router = useRouter();

  const { sensors, handleDragEnd } = useSortableList({
    items: stories,
    setItems: setStories,
    endpoint: "/api/stories",
    onError: showError,
  });

  const fetchStories = useCallback(async () => {
    const res = await fetch("/api/stories");
    const data = await res.json();
    setStories(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchStories();
  }, [fetchStories]);

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);

    const res = await fetch("/api/stories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: form.get("title"),
        position: stories.length,
      }),
    });

    if (res.ok) {
      const story = await res.json();
      router.push(`/admin/stories/${story.id}/edit`);
    } else {
      showError("Failed to create story");
    }
  }

  async function handleUpdateSettings(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);

    const isPasswordProtected = form.get("isPasswordProtected") === "on";
    const password = form.get("password") as string;

    const typography: StoryTypography = {};
    const fontHeadings = form.get("fontHeadings") as string;
    const fontBody = form.get("fontBody") as string;
    const bodyFontSize = form.get("bodyFontSize") as string;
    if (fontHeadings) typography.fontHeadings = fontHeadings;
    if (fontBody) typography.fontBody = fontBody;
    if (bodyFontSize) typography.bodyFontSize = bodyFontSize as StoryTypography["bodyFontSize"];

    const payload: Record<string, unknown> = {
      id: editSettings,
      title: form.get("title"),
      showTitle: form.get("showTitle") === "on",
      metaTitle: form.get("metaTitle") || null,
      metaDescription: form.get("metaDescription") || null,
      isPasswordProtected,
      typography: Object.keys(typography).length > 0 ? typography : null,
    };

    if (isPasswordProtected && password) {
      payload.password = password;
    }

    const res = await fetch("/api/stories", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      setEditSettings(null);
      showSuccess("Story updated!");
      fetchStories();
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this story?")) return;
    const res = await fetch(`/api/stories?id=${id}`, { method: "DELETE" });
    if (res.ok) {
      showSuccess("Story deleted");
      fetchStories();
    } else {
      showError("Failed to delete story");
    }
  }

  async function togglePublish(story: Story) {
    const res = await fetch("/api/stories", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: story.id, isPublished: !story.isPublished }),
    });
    if (res.ok) {
      fetchStories();
    } else {
      showError("Failed to update story");
    }
  }

  if (loading) return <div className="text-neutral-500">Loading...</div>;

  const editingStory = stories.find((s) => s.id === editSettings);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Stories</h1>
        <button onClick={() => setShowNewForm(true)} className="btn-primary">
          New Story
        </button>
      </div>

      {message && (
        <div className={alertClass}>
          {message.text}
        </div>
      )}

      {/* New story form */}
      {showNewForm && (
        <form
          onSubmit={handleCreate}
          className="mb-6 rounded-lg border border-neutral-200 bg-white p-4"
        >
          <h2 className="mb-3 text-sm font-medium">New Story</h2>
          <div className="space-y-3">
            <input
              name="title"
              placeholder="Story title"
              required
              autoFocus
              className="input-base"
            />
            <div className="flex gap-2">
              <button type="submit" className="btn-primary">Create &amp; Edit</button>
              <button type="button" onClick={() => setShowNewForm(false)} className="btn-secondary">
                Cancel
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Edit settings form */}
      {editSettings && editingStory && (
        <form
          onSubmit={handleUpdateSettings}
          className="mb-6 rounded-lg border border-neutral-200 bg-white p-4"
        >
          <h2 className="mb-3 text-sm font-medium">Story Settings</h2>
          <div className="space-y-3">
            <input
              name="title"
              placeholder="Story title"
              defaultValue={editingStory.title}
              required
              className="input-base"
            />
            <label className="flex items-center gap-2 text-sm text-neutral-700">
              <input
                type="checkbox"
                name="showTitle"
                defaultChecked={editingStory.showTitle}
                className="rounded border-neutral-300"
              />
              Show story title
            </label>

            {/* Password Protection */}
            <details className="rounded border border-neutral-200 p-3">
              <summary className="cursor-pointer text-sm font-medium text-neutral-600">Password Protection</summary>
              <div className="mt-3 space-y-3">
                <label className="flex items-center gap-2 text-sm text-neutral-700">
                  <input
                    type="checkbox"
                    name="isPasswordProtected"
                    defaultChecked={editingStory.isPasswordProtected}
                    className="rounded border-neutral-300"
                  />
                  Require password to read
                </label>
                <input
                  name="password"
                  type="password"
                  placeholder={editingStory.isPasswordProtected ? "Leave blank to keep current password" : "Set a password"}
                  className="input-base"
                />
              </div>
            </details>

            {/* Typography */}
            <details className="rounded border border-neutral-200 p-3">
              <summary className="cursor-pointer text-sm font-medium text-neutral-600">Typography</summary>
              <div className="mt-3 space-y-3">
                <FontSelect
                  label="Heading Font"
                  name="fontHeadings"
                  defaultValue={editingStory.typography?.fontHeadings ?? ""}
                />
                <FontSelect
                  label="Body Font"
                  name="fontBody"
                  defaultValue={editingStory.typography?.fontBody ?? ""}
                />
                <div>
                  <label className="mb-1 block text-sm font-medium text-neutral-700">Body Font Size</label>
                  <select
                    name="bodyFontSize"
                    defaultValue={editingStory.typography?.bodyFontSize ?? "medium"}
                    className="input-base"
                  >
                    <option value="small">Small</option>
                    <option value="medium">Medium</option>
                    <option value="large">Large</option>
                  </select>
                </div>
              </div>
            </details>

            {/* SEO */}
            <details className="rounded border border-neutral-200 p-3">
              <summary className="cursor-pointer text-sm font-medium text-neutral-600">SEO Settings</summary>
              <div className="mt-3 space-y-3">
                <input
                  name="metaTitle"
                  placeholder="Meta title (optional)"
                  defaultValue={editingStory.metaTitle ?? ""}
                  className="input-base"
                />
                <textarea
                  name="metaDescription"
                  placeholder="Meta description (optional)"
                  defaultValue={editingStory.metaDescription ?? ""}
                  rows={2}
                  className="input-base"
                />
              </div>
            </details>

            <div className="flex gap-2">
              <button type="submit" className="btn-primary">Save Settings</button>
              <button type="button" onClick={() => setEditSettings(null)} className="btn-secondary">
                Cancel
              </button>
            </div>
          </div>
        </form>
      )}

      {stories.length === 0 ? (
        <p className="text-sm text-neutral-500">No stories yet. Create one to get started.</p>
      ) : (
        <div className="rounded-lg border border-neutral-200 bg-white">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={stories.map((s) => s.id)} strategy={verticalListSortingStrategy}>
              {stories.map((story) => (
                <SortableItem key={story.id} id={story.id}>
                  <div className="flex items-center justify-between border-b border-neutral-100 px-4 py-3 last:border-0">
                    <div className="flex items-center gap-3">
                      <div>
                        <span className="font-medium">{story.title}</span>
                        <span className="ml-2 text-sm text-neutral-400">/stories/{story.slug}</span>
                        <span
                          className={`ml-2 rounded px-1.5 py-0.5 text-xs ${
                            story.isPublished
                              ? "bg-green-50 text-green-600"
                              : "bg-neutral-100 text-neutral-500"
                          }`}
                        >
                          {story.isPublished ? "Published" : "Draft"}
                        </span>
                        {story.isPasswordProtected && (
                          <span className="ml-2 rounded bg-amber-50 px-1.5 py-0.5 text-xs text-amber-600">
                            Protected
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => togglePublish(story)} className="btn-text">
                        {story.isPublished ? "Unpublish" : "Publish"}
                      </button>
                      <button
                        onClick={() => router.push(`/admin/stories/${story.id}/edit`)}
                        className="btn-text"
                      >
                        Edit Content
                      </button>
                      <button
                        onClick={() => { setEditSettings(story.id); setShowNewForm(false); }}
                        className="btn-text"
                      >
                        Settings
                      </button>
                      <button
                        onClick={() => handleDelete(story.id)}
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

/* --- Helper Components --- */

function FontSelect({
  label,
  name,
  defaultValue,
}: {
  label: string;
  name: string;
  defaultValue: string;
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-neutral-700">{label}</label>
      <select name={name} defaultValue={defaultValue} className="input-base">
        <option value="">Use theme default</option>
        <optgroup label="Serif">
          {SERIF_FONTS.map((f) => (
            <option key={f.name} value={f.name}>{f.name}</option>
          ))}
        </optgroup>
        <optgroup label="Sans-Serif">
          {SANS_FONTS.map((f) => (
            <option key={f.name} value={f.name}>{f.name}</option>
          ))}
        </optgroup>
        <optgroup label="Display">
          {DISPLAY_FONTS.map((f) => (
            <option key={f.name} value={f.name}>{f.name}</option>
          ))}
        </optgroup>
      </select>
    </div>
  );
}
