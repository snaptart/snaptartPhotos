"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { DndContext, closestCenter } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { ArrowLeft, ArrowRight, MapPin, Plus, X } from "lucide-react";
import { SortableItem } from "@/components/admin/SortableItem";
import { useSortableList } from "@/lib/hooks/useSortableList";
import { useMessage } from "@/lib/hooks/useMessage";
import siteConfig from "@/lib/site.config";
import {
  DEFAULT_ROOM_CAPTION_FIELDS,
  ROOM_CAPTION_FIELD_OPTIONS,
} from "@/components/public/hall/RoomView";
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
  tagline: string | null;
  accentColor: string | null;
  latitude: number | null;
  longitude: number | null;
  previewPhotoIds: string[] | null;
  roomCaptionFields: string[] | null;
  coverImageUrl: string | null;
  parentId: string | null;
  position: number;
  isPublished: boolean;
}

interface PickerPhoto {
  id: string;
  thumbnailUrl: string;
  title: string | null;
  position: number;
}

const MAX_PREVIEW = 4;

function isValidHex(v: string): boolean {
  return /^#[0-9a-fA-F]{6}$/.test(v);
}

export default function GalleriesPage() {
  const [galleries, setGalleries] = useState<Gallery[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pickerPhotos, setPickerPhotos] = useState<PickerPhoto[]>([]);
  const [previewIds, setPreviewIds] = useState<string[]>([]);
  const [accentColor, setAccentColor] = useState<string>("");
  const [captionFields, setCaptionFields] = useState<string[]>([...DEFAULT_ROOM_CAPTION_FIELDS]);
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
    setGalleries(Array.isArray(data) ? data : []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchGalleries();
  }, [fetchGalleries]);

  useEffect(() => {
    if (!editingId) {
      setPickerPhotos([]);
      setPreviewIds([]);
      setAccentColor("");
      setCaptionFields([...DEFAULT_ROOM_CAPTION_FIELDS]);
      return;
    }
    const gallery = galleries.find((g) => g.id === editingId);
    if (!gallery) return;
    setPreviewIds(gallery.previewPhotoIds ?? []);
    setAccentColor(gallery.accentColor ?? "");
    setCaptionFields(gallery.roomCaptionFields ?? [...DEFAULT_ROOM_CAPTION_FIELDS]);
    let cancelled = false;
    (async () => {
      const res = await fetch(`/api/photos?galleryId=${editingId}`);
      if (!res.ok) return;
      const data = (await res.json()) as PickerPhoto[];
      if (!cancelled) setPickerPhotos(data);
    })();
    return () => {
      cancelled = true;
    };
  }, [editingId, galleries]);

  async function handleAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const res = await fetch("/api/galleries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: form.get("title"),
        description: form.get("description") || null,
        tagline: form.get("tagline") || null,
        accentColor: accentColor || null,
        latitude: parseNullableFloat(form.get("latitude")),
        longitude: parseNullableFloat(form.get("longitude")),
        roomCaptionFields: captionFields,
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
        tagline: form.get("tagline") || null,
        accentColor: accentColor || null,
        latitude: parseNullableFloat(form.get("latitude")),
        longitude: parseNullableFloat(form.get("longitude")),
        previewPhotoIds: previewIds.length > 0 ? previewIds : null,
        roomCaptionFields: captionFields,
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
          <div className="flex items-center gap-2">
            <Link
              href="/admin/galleries/layout"
              className="inline-flex items-center gap-1.5 text-[12px] font-mono uppercase tracking-[1.5px] text-admin-ink-soft hover:text-admin-ink"
            >
              <MapPin className="h-3.5 w-3.5" /> Field Map
            </Link>
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
          </div>
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
              <Field label="Tagline" htmlFor="g-tagline" hint="Shown as the flavor line on Field Map pins and region view">
                <Textarea
                  id="g-tagline"
                  name="tagline"
                  defaultValue={editingGallery?.tagline ?? ""}
                  placeholder="A short italic line that greets visitors."
                  rows={2}
                />
              </Field>
              <Field label="Accent color" htmlFor="g-accent" hint="Used on hover and the drawer underline. Click the swatch to pick.">
                <div className="flex items-center gap-2">
                  <label className="relative inline-block h-9 w-9 cursor-pointer rounded overflow-hidden border border-admin-border-strong shrink-0">
                    <input
                      type="color"
                      value={isValidHex(accentColor) ? accentColor : "#b8824a"}
                      onChange={(e) => setAccentColor(e.target.value)}
                      className="absolute inset-0 h-full w-full opacity-0 cursor-pointer"
                      aria-label="Pick accent color"
                    />
                    <span
                      className="absolute inset-0 block"
                      style={{
                        background: isValidHex(accentColor) ? accentColor : "transparent",
                        backgroundImage: !isValidHex(accentColor)
                          ? "repeating-conic-gradient(#e4e1db 0% 25%, #fff 0% 50%) 50% / 8px 8px"
                          : undefined,
                      }}
                    />
                  </label>
                  <Input
                    id="g-accent"
                    value={accentColor}
                    onChange={(e) => setAccentColor(e.target.value)}
                    placeholder="#b8824a"
                    pattern="^#[0-9a-fA-F]{6}$"
                  />
                  {accentColor && (
                    <button
                      type="button"
                      onClick={() => setAccentColor("")}
                      className="text-[11px] font-mono uppercase tracking-[1.5px] text-admin-ink-soft hover:text-admin-danger"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </Field>
              <Field label="Field Map position" htmlFor="g-latitude" hint="Decimal degrees. Pins the gallery to the world map.">
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    id="g-latitude"
                    name="latitude"
                    type="number"
                    step="any"
                    min={-90}
                    max={90}
                    defaultValue={editingGallery?.latitude ?? ""}
                    placeholder="Latitude (e.g. 48.8566)"
                  />
                  <Input
                    id="g-longitude"
                    name="longitude"
                    type="number"
                    step="any"
                    min={-180}
                    max={180}
                    defaultValue={editingGallery?.longitude ?? ""}
                    placeholder="Longitude (e.g. 2.3522)"
                  />
                </div>
              </Field>
              <Field label="Room caption fields" htmlFor="g-caption-fields" hint="What appears below each framed photo in the room view.">
                <div id="g-caption-fields" className="flex flex-col gap-1.5">
                  {ROOM_CAPTION_FIELD_OPTIONS.map((opt) => (
                    <label
                      key={opt.key}
                      className="flex items-center gap-2 text-[13px] text-admin-ink cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={captionFields.includes(opt.key)}
                        onChange={(e) => {
                          setCaptionFields((prev) =>
                            e.target.checked
                              ? [...prev, opt.key]
                              : prev.filter((k) => k !== opt.key),
                          );
                        }}
                        className="accent-admin-accent"
                      />
                      {opt.label}
                    </label>
                  ))}
                </div>
              </Field>
              {editingId && (
                <PreviewPicker
                  photos={pickerPhotos}
                  selected={previewIds}
                  onChange={setPreviewIds}
                />
              )}
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

function PreviewPicker({
  photos,
  selected,
  onChange,
}: {
  photos: PickerPhoto[];
  selected: string[];
  onChange: (next: string[]) => void;
}) {
  const byId = new Map(photos.map((p) => [p.id, p]));
  const selectedPhotos = selected
    .map((id) => byId.get(id))
    .filter((p): p is PickerPhoto => !!p);
  const available = photos.filter((p) => !selected.includes(p.id));

  const toggle = (id: string) => {
    if (selected.includes(id)) {
      onChange(selected.filter((x) => x !== id));
    } else if (selected.length < MAX_PREVIEW) {
      onChange([...selected, id]);
    }
  };

  const move = (id: string, delta: -1 | 1) => {
    const i = selected.indexOf(id);
    const j = i + delta;
    if (i < 0 || j < 0 || j >= selected.length) return;
    const next = [...selected];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };

  return (
    <div className="rounded-md border border-admin-border p-3">
      <div className="text-[13px] font-medium text-admin-ink mb-1">
        Hall preview thumbs
      </div>
      <p className="text-[12px] text-admin-ink-soft mb-3">
        Up to {MAX_PREVIEW} photos shown inside this gallery&apos;s room on{" "}
        <code>/hall</code>. Order sets rotation/position. Leave empty to fall
        back to the first two photos by position.
      </p>

      {photos.length === 0 ? (
        <p className="text-[12px] text-admin-ink-faint italic">
          No photos in this gallery yet.
        </p>
      ) : (
        <>
          {/* Selected slots */}
          <div className="mb-3">
            <div className="text-[11px] font-mono uppercase tracking-[1.5px] text-admin-ink-soft mb-2">
              Selected ({selected.length} / {MAX_PREVIEW})
            </div>
            {selectedPhotos.length === 0 ? (
              <p className="text-[12px] text-admin-ink-faint italic">
                Click photos below to add them.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {selectedPhotos.map((photo, i) => (
                  <div
                    key={photo.id}
                    className="relative group w-20 h-20 rounded overflow-hidden border border-admin-border-strong bg-white"
                  >
                    <Image
                      src={photo.thumbnailUrl}
                      alt={photo.title ?? ""}
                      fill
                      sizes="80px"
                      className="object-cover"
                    />
                    <div className="absolute top-1 left-1 h-5 w-5 rounded-full bg-admin-accent text-white text-[11px] font-medium flex items-center justify-center shadow">
                      {i + 1}
                    </div>
                    <div className="absolute inset-x-0 bottom-0 flex justify-between bg-black/55 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        type="button"
                        onClick={() => move(photo.id, -1)}
                        disabled={i === 0}
                        className="flex-1 py-1 text-white disabled:opacity-30 hover:bg-black/40"
                        aria-label="Move earlier"
                      >
                        <ArrowLeft className="h-3 w-3 mx-auto" />
                      </button>
                      <button
                        type="button"
                        onClick={() => toggle(photo.id)}
                        className="flex-1 py-1 text-white hover:bg-admin-danger"
                        aria-label="Remove"
                      >
                        <X className="h-3 w-3 mx-auto" />
                      </button>
                      <button
                        type="button"
                        onClick={() => move(photo.id, 1)}
                        disabled={i === selectedPhotos.length - 1}
                        className="flex-1 py-1 text-white disabled:opacity-30 hover:bg-black/40"
                        aria-label="Move later"
                      >
                        <ArrowRight className="h-3 w-3 mx-auto" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Available photos */}
          <div>
            <div className="text-[11px] font-mono uppercase tracking-[1.5px] text-admin-ink-soft mb-2">
              Available ({available.length})
            </div>
            {available.length === 0 ? (
              <p className="text-[12px] text-admin-ink-faint italic">
                All photos are in the preview set.
              </p>
            ) : (
              <div className="grid grid-cols-[repeat(auto-fill,minmax(64px,1fr))] gap-2 max-h-48 overflow-y-auto">
                {available.map((photo) => {
                  const atCap = selected.length >= MAX_PREVIEW;
                  return (
                    <button
                      key={photo.id}
                      type="button"
                      onClick={() => toggle(photo.id)}
                      disabled={atCap}
                      className="relative w-full aspect-square rounded overflow-hidden border border-admin-border hover:border-admin-accent disabled:opacity-40 disabled:hover:border-admin-border transition-colors"
                      title={atCap ? `Max ${MAX_PREVIEW} photos` : photo.title ?? ""}
                    >
                      <Image
                        src={photo.thumbnailUrl}
                        alt={photo.title ?? ""}
                        fill
                        sizes="80px"
                        className="object-cover"
                      />
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function parseNullableFloat(v: FormDataEntryValue | null): number | null {
  if (v == null) return null;
  const s = String(v).trim();
  if (s === "") return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}
