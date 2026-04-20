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
import { CURATED_FONTS } from "@/lib/theme/fonts";
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

interface StoryTypography {
  fontHeadings?: string;
  fontBody?: string;
  bodyFontSize?: "small" | "medium" | "large";
}

interface StoryMeta {
  dek?: string;
  kind?: string;
  year?: string | number;
  readTime?: string;
  wordCount?: number;
  frontispieceUrl?: string;
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
  storyMeta: StoryMeta | null;
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
      showError("Failed to create story.");
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
    if (bodyFontSize)
      typography.bodyFontSize = bodyFontSize as StoryTypography["bodyFontSize"];

    const storyMeta: StoryMeta = {};
    const dek = (form.get("dek") as string) || "";
    const kind = (form.get("kind") as string) || "";
    const year = (form.get("year") as string) || "";
    const readTime = (form.get("readTime") as string) || "";
    const wordCount = (form.get("wordCount") as string) || "";
    const frontispieceUrl = (form.get("frontispieceUrl") as string) || "";
    if (dek) storyMeta.dek = dek;
    if (kind) storyMeta.kind = kind;
    if (year) storyMeta.year = year;
    if (readTime) storyMeta.readTime = readTime;
    if (wordCount) {
      const n = parseInt(wordCount, 10);
      if (Number.isFinite(n) && n > 0) storyMeta.wordCount = n;
    }
    if (frontispieceUrl) storyMeta.frontispieceUrl = frontispieceUrl;

    const payload: Record<string, unknown> = {
      id: editSettings,
      title: form.get("title"),
      showTitle: form.get("showTitle") === "on",
      metaTitle: form.get("metaTitle") || null,
      metaDescription: form.get("metaDescription") || null,
      isPasswordProtected,
      typography: Object.keys(typography).length > 0 ? typography : null,
      storyMeta: Object.keys(storyMeta).length > 0 ? storyMeta : null,
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
      showSuccess("Story updated.");
      fetchStories();
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this story?")) return;
    const res = await fetch(`/api/stories?id=${id}`, { method: "DELETE" });
    if (res.ok) {
      showSuccess("Story deleted.");
      fetchStories();
    } else {
      showError("Failed to delete.");
    }
  }

  async function togglePublish(story: Story) {
    const res = await fetch("/api/stories", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: story.id, isPublished: !story.isPublished }),
    });
    if (res.ok) fetchStories();
    else showError("Failed to update.");
  }

  const editingStory = stories.find((s) => s.id === editSettings);

  return (
    <div className="-m-8 min-h-[calc(100vh-0px)] bg-admin-bg">
      <Topbar
        title="Stories"
        subtitle={`${stories.length} total · drag to reorder`}
        actions={
          <Button
            kind="primary"
            onClick={() => {
              setShowNewForm(true);
              setEditSettings(null);
            }}
            icon={<Plus className="h-3.5 w-3.5" />}
          >
            New story
          </Button>
        }
      />

      <div className="p-7 space-y-4">
        {message && <div className={alertClass}>{message.text}</div>}

        {showNewForm && (
          <Card
            header={
              <>
                <SectionLabel>New story</SectionLabel>
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
              <Field label="Title" htmlFor="ns-title">
                <Input
                  id="ns-title"
                  name="title"
                  placeholder="Story title"
                  required
                  autoFocus
                />
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

        {editSettings && editingStory && (
          <Card
            header={
              <>
                <SectionLabel>Story settings</SectionLabel>
                <button
                  onClick={() => setEditSettings(null)}
                  className="p-1 text-admin-ink-soft hover:text-admin-ink"
                  aria-label="Close"
                >
                  <X className="h-4 w-4" />
                </button>
              </>
            }
          >
            <form onSubmit={handleUpdateSettings} className="space-y-4">
              <Field label="Title" htmlFor="es-title">
                <Input
                  id="es-title"
                  name="title"
                  defaultValue={editingStory.title}
                  required
                />
              </Field>
              <label className="flex items-center gap-2 text-[13px] text-admin-ink cursor-pointer">
                <input
                  type="checkbox"
                  name="showTitle"
                  defaultChecked={editingStory.showTitle}
                  className="accent-admin-accent"
                />
                Show story title
              </label>

              <details className="rounded-md border border-admin-border p-3" open>
                <summary className="cursor-pointer text-[13px] font-medium text-admin-ink-soft">
                  Literary meta
                </summary>
                <div className="mt-3 space-y-4">
                  <Field label="Dek (subtitle)" htmlFor="es-dek" hint="Short italic description on contents page + title page">
                    <Textarea
                      id="es-dek"
                      name="dek"
                      defaultValue={editingStory.storyMeta?.dek ?? ""}
                      rows={2}
                      placeholder="e.g. A late-summer return to the orchard."
                    />
                  </Field>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Kind" htmlFor="es-kind" hint="e.g. Fiction · Flash · Essay">
                      <Input
                        id="es-kind"
                        name="kind"
                        defaultValue={editingStory.storyMeta?.kind ?? ""}
                        placeholder="Fiction"
                      />
                    </Field>
                    <Field label="Year" htmlFor="es-year">
                      <Input
                        id="es-year"
                        name="year"
                        defaultValue={
                          editingStory.storyMeta?.year != null
                            ? String(editingStory.storyMeta.year)
                            : ""
                        }
                        placeholder="2026"
                      />
                    </Field>
                    <Field label="Word count" htmlFor="es-wc" hint="Optional — drives read time if set">
                      <Input
                        id="es-wc"
                        name="wordCount"
                        type="number"
                        min={0}
                        defaultValue={editingStory.storyMeta?.wordCount ?? ""}
                        placeholder=""
                      />
                    </Field>
                    <Field label="Read time" htmlFor="es-rt" hint="Overrides the calculated value">
                      <Input
                        id="es-rt"
                        name="readTime"
                        defaultValue={editingStory.storyMeta?.readTime ?? ""}
                        placeholder="7 min read"
                      />
                    </Field>
                  </div>
                  <Field label="Frontispiece image URL" htmlFor="es-frontispiece" hint="Shown on the contents preview and above the body">
                    <Input
                      id="es-frontispiece"
                      name="frontispieceUrl"
                      type="url"
                      defaultValue={editingStory.storyMeta?.frontispieceUrl ?? ""}
                      placeholder="https://…"
                    />
                  </Field>
                </div>
              </details>

              <details className="rounded-md border border-admin-border p-3">
                <summary className="cursor-pointer text-[13px] font-medium text-admin-ink-soft">
                  Password protection
                </summary>
                <div className="mt-3 space-y-3">
                  <label className="flex items-center gap-2 text-[13px] text-admin-ink cursor-pointer">
                    <input
                      type="checkbox"
                      name="isPasswordProtected"
                      defaultChecked={editingStory.isPasswordProtected}
                      className="accent-admin-accent"
                    />
                    Require password to read
                  </label>
                  <Input
                    name="password"
                    type="password"
                    placeholder={
                      editingStory.isPasswordProtected
                        ? "Leave blank to keep current password"
                        : "Set a password"
                    }
                  />
                </div>
              </details>

              <details className="rounded-md border border-admin-border p-3">
                <summary className="cursor-pointer text-[13px] font-medium text-admin-ink-soft">
                  Typography
                </summary>
                <div className="mt-3 space-y-4">
                  <FontSelect
                    label="Heading font"
                    name="fontHeadings"
                    defaultValue={editingStory.typography?.fontHeadings ?? ""}
                  />
                  <FontSelect
                    label="Body font"
                    name="fontBody"
                    defaultValue={editingStory.typography?.fontBody ?? ""}
                  />
                  <Field label="Body font size" htmlFor="es-body-size">
                    <Select
                      id="es-body-size"
                      name="bodyFontSize"
                      defaultValue={
                        editingStory.typography?.bodyFontSize ?? "medium"
                      }
                    >
                      <option value="small">Small</option>
                      <option value="medium">Medium</option>
                      <option value="large">Large</option>
                    </Select>
                  </Field>
                </div>
              </details>

              <details className="rounded-md border border-admin-border p-3">
                <summary className="cursor-pointer text-[13px] font-medium text-admin-ink-soft">
                  SEO settings
                </summary>
                <div className="mt-3 space-y-4">
                  <Field label="Meta title" htmlFor="es-meta-title">
                    <Input
                      id="es-meta-title"
                      name="metaTitle"
                      defaultValue={editingStory.metaTitle ?? ""}
                      placeholder="Optional"
                    />
                  </Field>
                  <Field label="Meta description" htmlFor="es-meta-desc">
                    <Textarea
                      id="es-meta-desc"
                      name="metaDescription"
                      defaultValue={editingStory.metaDescription ?? ""}
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
                  onClick={() => setEditSettings(null)}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </Card>
        )}

        {loading ? (
          <div className="text-admin-ink-soft">Loading...</div>
        ) : stories.length === 0 ? (
          <EmptyState
            title="No stories yet"
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
                items={stories.map((s) => s.id)}
                strategy={verticalListSortingStrategy}
              >
                {stories.map((story) => (
                  <SortableItem key={story.id} id={story.id}>
                    <div className="flex items-center justify-between gap-3 border-b border-admin-border px-4 py-3 last:border-0">
                      <div className="min-w-0 flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-admin-ink truncate">
                          {story.title}
                        </span>
                        <span className="text-[12px] text-admin-ink-soft truncate">
                          /stories/{story.slug}
                        </span>
                        <Pill tone={story.isPublished ? "success" : "neutral"}>
                          {story.isPublished ? "Published" : "Draft"}
                        </Pill>
                        {story.isPasswordProtected && (
                          <Pill tone="warn">Protected</Pill>
                        )}
                      </div>
                      <div className="flex shrink-0 items-center gap-1.5">
                        <Button
                          kind="subtle"
                          size="sm"
                          onClick={() => togglePublish(story)}
                        >
                          {story.isPublished ? "Unpublish" : "Publish"}
                        </Button>
                        <Button
                          kind="ghost"
                          size="sm"
                          onClick={() =>
                            router.push(`/admin/stories/${story.id}/edit`)
                          }
                        >
                          Edit content
                        </Button>
                        <Button
                          kind="ghost"
                          size="sm"
                          onClick={() => {
                            setEditSettings(story.id);
                            setShowNewForm(false);
                          }}
                        >
                          Settings
                        </Button>
                        <Button
                          kind="danger"
                          size="sm"
                          onClick={() => handleDelete(story.id)}
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
    <Field label={label}>
      <Select name={name} defaultValue={defaultValue}>
        <option value="">Use theme default</option>
        <optgroup label="Serif">
          {SERIF_FONTS.map((f) => (
            <option key={f.name} value={f.name}>
              {f.name}
            </option>
          ))}
        </optgroup>
        <optgroup label="Sans-Serif">
          {SANS_FONTS.map((f) => (
            <option key={f.name} value={f.name}>
              {f.name}
            </option>
          ))}
        </optgroup>
        <optgroup label="Display">
          {DISPLAY_FONTS.map((f) => (
            <option key={f.name} value={f.name}>
              {f.name}
            </option>
          ))}
        </optgroup>
      </Select>
    </Field>
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
