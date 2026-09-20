"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import ImagePicker from "@/components/admin/ImagePicker";
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
  Textarea,
  Topbar,
} from "@/components/admin/ui";

interface StoryMeta {
  dek?: string;
  kind?: string;
  year?: string | number;
  readTime?: string;
  wordCount?: number;
  frontispieceUrl?: string;
  accentColor?: string;
  paperColor?: string;
  inkColor?: string;
  frontispieceAspect?: string;
  dropCap?: boolean;
  showEndMark?: boolean;
  endMark?: string;
  showProgressBar?: boolean;
  showNextStory?: boolean;
  bodyMaxWidth?: number;
  paginate?: boolean;
}

const BODY_MAX_WIDTH_DEFAULT = 680;
const BODY_MAX_WIDTH_MIN = 480;
const BODY_MAX_WIDTH_MAX = 1080;

const FRONTISPIECE_ASPECTS = [
  { value: "", label: "Default (16:9)" },
  { value: "16/9", label: "16 : 9" },
  { value: "3/2", label: "3 : 2" },
  { value: "4/3", label: "4 : 3" },
  { value: "1/1", label: "1 : 1 (square)" },
  { value: "original", label: "Original (no crop)" },
];

const DEFAULT_END_MARK = "❦";

function isValidHex(v: string): boolean {
  return /^#[0-9a-fA-F]{6}$/.test(v);
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
  storyMeta: StoryMeta | null;
  hasGalleryEmbed?: boolean;
}

export default function StoriesPage() {
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewForm, setShowNewForm] = useState(false);
  const [editSettings, setEditSettings] = useState<string | null>(null);
  const [frontispieceUrl, setFrontispieceUrl] = useState("");
  const [accentColor, setAccentColor] = useState("");
  const [paperColor, setPaperColor] = useState("");
  const [inkColor, setInkColor] = useState("");
  const [frontispieceAspect, setFrontispieceAspect] = useState("");
  const [dropCap, setDropCap] = useState(true);
  const [showEndMark, setShowEndMark] = useState(true);
  const [endMark, setEndMark] = useState("");
  const [showProgressBar, setShowProgressBar] = useState(true);
  const [showNextStory, setShowNextStory] = useState(true);
  const [bodyMaxWidth, setBodyMaxWidth] = useState<string>("");
  const [paginate, setPaginate] = useState(false);
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

  useEffect(() => {
    const current = stories.find((s) => s.id === editSettings);
    const meta = current?.storyMeta ?? {};
    setFrontispieceUrl(meta.frontispieceUrl ?? "");
    setAccentColor(meta.accentColor ?? "");
    setPaperColor(meta.paperColor ?? "");
    setInkColor(meta.inkColor ?? "");
    setFrontispieceAspect(meta.frontispieceAspect ?? "");
    setDropCap(meta.dropCap !== false);
    setShowEndMark(meta.showEndMark !== false);
    setEndMark(meta.endMark ?? "");
    setShowProgressBar(meta.showProgressBar !== false);
    setShowNextStory(meta.showNextStory !== false);
    setBodyMaxWidth(meta.bodyMaxWidth != null ? String(meta.bodyMaxWidth) : "");
    setPaginate(meta.paginate === true);
  }, [editSettings, stories]);

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

    const storyMeta: StoryMeta = {};
    const dek = (form.get("dek") as string) || "";
    const kind = (form.get("kind") as string) || "";
    const year = (form.get("year") as string) || "";
    const readTime = (form.get("readTime") as string) || "";
    const wordCount = (form.get("wordCount") as string) || "";
    if (dek) storyMeta.dek = dek;
    if (kind) storyMeta.kind = kind;
    if (year) storyMeta.year = year;
    if (readTime) storyMeta.readTime = readTime;
    if (wordCount) {
      const n = parseInt(wordCount, 10);
      if (Number.isFinite(n) && n > 0) storyMeta.wordCount = n;
    }
    if (frontispieceUrl) storyMeta.frontispieceUrl = frontispieceUrl;
    if (isValidHex(accentColor)) storyMeta.accentColor = accentColor;
    if (isValidHex(paperColor)) storyMeta.paperColor = paperColor;
    if (isValidHex(inkColor)) storyMeta.inkColor = inkColor;
    if (frontispieceAspect) storyMeta.frontispieceAspect = frontispieceAspect;
    if (!dropCap) storyMeta.dropCap = false;
    if (!showEndMark) storyMeta.showEndMark = false;
    if (endMark && endMark !== DEFAULT_END_MARK) storyMeta.endMark = endMark;
    if (!showProgressBar) storyMeta.showProgressBar = false;
    if (!showNextStory) storyMeta.showNextStory = false;
    if (bodyMaxWidth) {
      const n = parseInt(bodyMaxWidth, 10);
      if (Number.isFinite(n) && n !== BODY_MAX_WIDTH_DEFAULT) {
        const clamped = Math.max(BODY_MAX_WIDTH_MIN, Math.min(BODY_MAX_WIDTH_MAX, n));
        storyMeta.bodyMaxWidth = clamped;
      }
    }
    const currentStory = stories.find((s) => s.id === editSettings);
    if (paginate && !currentStory?.hasGalleryEmbed) storyMeta.paginate = true;

    const payload: Record<string, unknown> = {
      id: editSettings,
      title: form.get("title"),
      showTitle: form.get("showTitle") === "on",
      metaTitle: form.get("metaTitle") || null,
      metaDescription: form.get("metaDescription") || null,
      isPasswordProtected,
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
          <div className="flex items-center gap-2">
            <Button
              kind="ghost"
              onClick={() => router.push("/admin/stories/index/edit")}
            >
              Edit contents page
            </Button>
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
          </div>
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
                  <Field label="Frontispiece image" hint="Shown on the contents preview and above the body">
                    <ImagePicker
                      value={frontispieceUrl}
                      onChange={setFrontispieceUrl}
                    />
                  </Field>
                </div>
              </details>

              <details className="rounded-md border border-admin-border p-3">
                <summary className="cursor-pointer text-[13px] font-medium text-admin-ink-soft">
                  Reading-page chrome
                </summary>
                <div className="mt-3 space-y-4">
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                    <Field label="Accent color" hint="Default #b8824a">
                      <ColorField value={accentColor} onChange={setAccentColor} fallback="#b8824a" />
                    </Field>
                    <Field label="Paper color" hint="Default #ffffff">
                      <ColorField value={paperColor} onChange={setPaperColor} fallback="#ffffff" />
                    </Field>
                    <Field label="Ink color" hint="Default #2a2620">
                      <ColorField value={inkColor} onChange={setInkColor} fallback="#2a2620" />
                    </Field>
                  </div>
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <Field label="Frontispiece aspect" htmlFor="es-aspect">
                      <select
                        id="es-aspect"
                        value={frontispieceAspect}
                        onChange={(e) => setFrontispieceAspect(e.target.value)}
                        className="w-full rounded-md border border-admin-border bg-admin-input-bg px-3 py-2 text-[13px] text-admin-ink"
                      >
                        {FRONTISPIECE_ASPECTS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field
                      label="Body max width (px)"
                      htmlFor="es-bodywidth"
                      hint={`Default ${BODY_MAX_WIDTH_DEFAULT}, range ${BODY_MAX_WIDTH_MIN}–${BODY_MAX_WIDTH_MAX}`}
                    >
                      <Input
                        id="es-bodywidth"
                        type="number"
                        min={BODY_MAX_WIDTH_MIN}
                        max={BODY_MAX_WIDTH_MAX}
                        step={20}
                        value={bodyMaxWidth}
                        onChange={(e) => setBodyMaxWidth(e.target.value)}
                        placeholder={String(BODY_MAX_WIDTH_DEFAULT)}
                      />
                    </Field>
                  </div>
                  <div className="rounded-md border border-admin-border bg-admin-bg-soft p-3">
                    <label className={`flex items-center gap-2 text-[13px] ${editingStory.hasGalleryEmbed ? "text-admin-ink-soft cursor-not-allowed" : "text-admin-ink cursor-pointer"}`}>
                      <input
                        type="checkbox"
                        checked={paginate && !editingStory.hasGalleryEmbed}
                        onChange={(e) => setPaginate(e.target.checked)}
                        disabled={editingStory.hasGalleryEmbed}
                        className="accent-admin-accent"
                      />
                      Paginate (Kindle-style page turns)
                    </label>
                    <p className="mt-1.5 text-[11px] text-admin-ink-soft leading-snug">
                      {editingStory.hasGalleryEmbed
                        ? "Disabled: this story contains a GalleryEmbed block, which doesn’t fit a paginated reader. Remove the embed to enable pagination."
                        : "Reader advances by tap, arrow keys, or swipe. Replaces the scroll/progress bar."}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <label className="flex items-center gap-2 text-[13px] text-admin-ink cursor-pointer">
                      <input
                        type="checkbox"
                        checked={dropCap}
                        onChange={(e) => setDropCap(e.target.checked)}
                        className="accent-admin-accent"
                      />
                      Drop-cap on first paragraph
                    </label>
                    <label className="flex items-center gap-2 text-[13px] text-admin-ink cursor-pointer">
                      <input
                        type="checkbox"
                        checked={showProgressBar}
                        onChange={(e) => setShowProgressBar(e.target.checked)}
                        className="accent-admin-accent"
                      />
                      Show reading progress bar
                    </label>
                    <label className="flex items-center gap-2 text-[13px] text-admin-ink cursor-pointer">
                      <input
                        type="checkbox"
                        checked={showNextStory}
                        onChange={(e) => setShowNextStory(e.target.checked)}
                        className="accent-admin-accent"
                      />
                      Show &ldquo;next story&rdquo; card
                    </label>
                    <label className="flex items-center gap-2 text-[13px] text-admin-ink cursor-pointer">
                      <input
                        type="checkbox"
                        checked={showEndMark}
                        onChange={(e) => setShowEndMark(e.target.checked)}
                        className="accent-admin-accent"
                      />
                      Show end mark
                    </label>
                  </div>
                  {showEndMark && (
                    <Field label="End-mark glyph" htmlFor="es-endmark" hint={`Leave blank to use ${DEFAULT_END_MARK}`}>
                      <Input
                        id="es-endmark"
                        value={endMark}
                        onChange={(e) => setEndMark(e.target.value)}
                        placeholder={DEFAULT_END_MARK}
                        maxLength={8}
                      />
                    </Field>
                  )}
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

function ColorField({
  value,
  onChange,
  fallback,
}: {
  value: string;
  onChange: (v: string) => void;
  fallback: string;
}) {
  const valid = isValidHex(value);
  return (
    <div className="flex items-center gap-2">
      <label className="relative inline-block h-9 w-9 cursor-pointer rounded overflow-hidden border border-admin-border-strong shrink-0">
        <input
          type="color"
          value={valid ? value : fallback}
          onChange={(e) => onChange(e.target.value)}
          className="absolute inset-0 h-full w-full opacity-0 cursor-pointer"
          aria-label="Pick color"
        />
        <span
          className="absolute inset-0 block"
          style={{
            background: valid ? value : "transparent",
            backgroundImage: !valid
              ? "repeating-conic-gradient(#e4e1db 0% 25%, #fff 0% 50%) 50% / 8px 8px"
              : undefined,
          }}
        />
      </label>
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={fallback}
        pattern="^#[0-9a-fA-F]{6}$"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          className="text-[11px] font-mono uppercase tracking-[1.5px] text-admin-ink-soft hover:text-admin-danger"
        >
          Clear
        </button>
      )}
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
