"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  arrayMove,
  useSortable,
} from "@dnd-kit/sortable";
import type { DragEndEvent } from "@dnd-kit/core";
import {
  Upload,
  Pencil,
  Trash2,
  Star,
  Copy,
  X,
  ExternalLink,
  AlertCircle,
  Search,
  GripVertical,
} from "lucide-react";
import { SortableGridItem } from "@/components/admin/SortableGridItem";
import FocalPointPicker from "@/components/admin/FocalPointPicker";
import { PhotoBulkEditDrawer } from "@/components/admin/PhotoBulkEditDrawer";
import { useMessage } from "@/lib/hooks/useMessage";
import siteConfig from "@/lib/site.config";
import { cn } from "@/lib/utils";
import {
  Button,
  Field,
  Input,
  Select,
  Topbar,
  SectionLabel,
} from "@/components/admin/ui";

interface Photo {
  id: string;
  galleryId: string;
  blobUrl: string;
  url: string;
  thumbnailUrl: string;
  filename: string | null;
  title: string | null;
  description: string | null;
  location: string | null;
  latitude: number | null;
  longitude: number | null;
  tags: string[] | null;
  width: number;
  height: number;
  focalX: number;
  focalY: number;
  position: number;
  createdAt: string;
}

interface Gallery {
  id: string;
  title: string;
  slug: string;
}

type Filter = "all" | "needs-title" | "needs-location";
type SortKey =
  | "position"
  | "newest"
  | "oldest"
  | "title"
  | "filename";

export default function PhotosPage() {
  const searchParams = useSearchParams();
  const galleryIdParam = searchParams.get("galleryId");

  const [photos, setPhotos] = useState<Photo[]>([]);
  const [galleries, setGalleries] = useState<Gallery[]>([]);
  const [selectedGallery, setSelectedGallery] = useState<string>(
    galleryIdParam ?? "",
  );
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingFocal, setEditingFocal] = useState<{ x: number; y: number }>({
    x: 50,
    y: 50,
  });
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<Filter>("all");
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("position");
  const { message, showSuccess, showError, alertClass } = useMessage();

  const sensors = useSensors(
    // 6px activation distance so clicks don't trigger drag
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const toggleSelected = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);
  const clearSelection = useCallback(() => setSelected(new Set()), []);

  useEffect(() => {
    clearSelection();
  }, [selectedGallery, clearSelection]);

  const fetchGalleries = useCallback(async () => {
    const res = await fetch("/api/galleries");
    const data = await res.json();
    setGalleries(data);
  }, []);

  const fetchPhotos = useCallback(async () => {
    if (!selectedGallery) {
      setPhotos([]);
      setLoading(false);
      return;
    }
    const res = await fetch(`/api/photos?galleryId=${selectedGallery}`);
    const data = await res.json();
    setPhotos(data);
    setLoading(false);
  }, [selectedGallery]);

  useEffect(() => {
    fetchGalleries();
  }, [fetchGalleries]);
  useEffect(() => {
    setLoading(true);
    fetchPhotos();
  }, [fetchPhotos]);

  async function handleDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIndex = photos.findIndex((p) => p.id === active.id);
    const newIndex = photos.findIndex((p) => p.id === over.id);
    const reordered = arrayMove(photos, oldIndex, newIndex);
    setPhotos(reordered);

    const res = await fetch("/api/photos", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        galleryId: selectedGallery,
        items: reordered.map((p, i) => ({ id: p.id, position: i })),
      }),
    });
    if (!res.ok) showError("Failed to save order.");
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    if (!selectedGallery || !e.target.files?.length) return;
    setUploading(true);
    const files = Array.from(e.target.files);
    let uploaded = 0;

    for (const file of files) {
      const dimensions = await new Promise<{ width: number; height: number }>(
        (resolve) => {
          const img = new window.Image();
          img.onload = () => {
            resolve({ width: img.naturalWidth, height: img.naturalHeight });
            URL.revokeObjectURL(img.src);
          };
          img.src = URL.createObjectURL(file);
        },
      );

      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", "galleries");

      const uploadRes = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      if (!uploadRes.ok) {
        showError(`Failed to upload ${file.name}`);
        continue;
      }
      const { blobUrl, url, thumbnailUrl } = await uploadRes.json();

      const photoRes = await fetch("/api/photos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          galleryId: selectedGallery,
          blobUrl,
          url,
          thumbnailUrl,
          width: dimensions.width,
          height: dimensions.height,
          filename: file.name,
          position: photos.length + uploaded,
        }),
      });
      if (!photoRes.ok) {
        showError(`Failed to save ${file.name}`);
        continue;
      }
      uploaded++;
    }

    showSuccess(
      `${uploaded} ${
        uploaded !== 1
          ? siteConfig.labels.photos.toLowerCase()
          : siteConfig.labels.photo.toLowerCase()
      } uploaded!`,
    );
    setUploading(false);
    e.target.value = "";
    fetchPhotos();
  }

  async function handleUpdate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const res = await fetch("/api/photos", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: editingId,
        filename: form.get("filename") || null,
        title: form.get("title") || null,
        description: form.get("description") || null,
        location: form.get("location") || null,
        latitude: parseNullableFloat(form.get("latitude")),
        longitude: parseNullableFloat(form.get("longitude")),
        tags: parseTagsInput(form.get("tags")),
        focalX: editingFocal.x,
        focalY: editingFocal.y,
      }),
    });
    if (res.ok) {
      setEditingId(null);
      showSuccess(`${siteConfig.labels.photo} updated.`);
      fetchPhotos();
    }
  }

  async function handleDelete(id: string) {
    if (!confirm(`Delete this ${siteConfig.labels.photo.toLowerCase()}?`))
      return;
    const res = await fetch(`/api/photos?id=${id}`, { method: "DELETE" });
    if (res.ok) {
      showSuccess(`${siteConfig.labels.photo} deleted.`);
      fetchPhotos();
    } else {
      showError(`Failed to delete.`);
    }
  }

  async function setCover(photo: Photo) {
    const res = await fetch("/api/galleries", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: selectedGallery,
        coverImageUrl: photo.thumbnailUrl,
      }),
    });
    if (res.ok) showSuccess("Cover image updated.");
    else showError("Failed to set cover.");
  }

  async function handleBulkApply(patch: {
    galleryId?: string;
    location?: string | null;
    tags?: string[];
  }) {
    const ids = Array.from(selected);
    if (ids.length === 0) return;
    const res = await fetch("/api/photos", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bulk: { ids, patch } }),
    });
    if (res.ok) {
      showSuccess(
        `Updated ${ids.length} ${
          ids.length === 1
            ? siteConfig.labels.photo.toLowerCase()
            : siteConfig.labels.photos.toLowerCase()
        }.`,
      );
      clearSelection();
      fetchPhotos();
    } else {
      showError("Bulk update failed.");
    }
  }

  const editingPhoto = photos.find((p) => p.id === editingId);
  const currentGallery = galleries.find((g) => g.id === selectedGallery);

  const uniqueTags = useMemo(() => {
    const set = new Set<string>();
    for (const p of photos) {
      if (p.tags) for (const t of p.tags) set.add(t);
    }
    return [...set].sort();
  }, [photos]);

  const visible = useMemo(() => {
    let list = photos;

    if (filter === "needs-title") {
      list = list.filter((p) => !p.title || p.title.trim() === "");
    } else if (filter === "needs-location") {
      list = list.filter((p) => !p.location || p.location.trim() === "");
    }

    if (activeTag) {
      list = list.filter((p) => p.tags?.includes(activeTag));
    }

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((p) =>
        [p.title, p.filename, p.description, p.location]
          .filter(Boolean)
          .some((v) => (v as string).toLowerCase().includes(q)),
      );
    }

    if (sortKey !== "position") {
      const sorted = [...list];
      switch (sortKey) {
        case "newest":
          sorted.sort(
            (a, b) =>
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
          );
          break;
        case "oldest":
          sorted.sort(
            (a, b) =>
              new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
          );
          break;
        case "title":
          sorted.sort((a, b) =>
            (a.title ?? a.filename ?? "").localeCompare(
              b.title ?? b.filename ?? "",
            ),
          );
          break;
        case "filename":
          sorted.sort((a, b) =>
            (a.filename ?? "").localeCompare(b.filename ?? ""),
          );
          break;
      }
      list = sorted;
    }

    return list;
  }, [photos, filter, activeTag, search, sortKey]);

  const needsTitleCount = photos.filter(
    (p) => !p.title || p.title.trim() === "",
  ).length;
  const needsLocationCount = photos.filter(
    (p) => !p.location || p.location.trim() === "",
  ).length;

  const selectedPhotos = useMemo(
    () => photos.filter((p) => selected.has(p.id)),
    [photos, selected],
  );

  async function handleBulkDelete() {
    const ids = Array.from(selected);
    if (ids.length === 0) return;
    if (
      !confirm(
        `Delete ${ids.length} ${
          ids.length === 1
            ? siteConfig.labels.photo.toLowerCase()
            : siteConfig.labels.photos.toLowerCase()
        }? This cannot be undone.`,
      )
    )
      return;

    const res = await fetch(`/api/photos?ids=${ids.join(",")}`, {
      method: "DELETE",
    });
    if (res.ok) {
      showSuccess(
        `Deleted ${ids.length} ${
          ids.length === 1
            ? siteConfig.labels.photo.toLowerCase()
            : siteConfig.labels.photos.toLowerCase()
        }.`,
      );
      clearSelection();
      fetchPhotos();
    } else {
      showError("Bulk delete failed.");
    }
  }

  async function handleBulkFillCaption(caption: string) {
    // Apply to photos with no existing description only
    const blankIds = Array.from(selected).filter((id) => {
      const p = photos.find((x) => x.id === id);
      return p && (!p.description || p.description.trim() === "");
    });
    if (blankIds.length === 0) {
      showError("All selected photos already have a caption.");
      return;
    }
    const res = await fetch("/api/photos", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        bulk: { ids: blankIds, patch: { description: caption } },
      }),
    });
    if (res.ok) {
      showSuccess(
        `Captioned ${blankIds.length} ${
          blankIds.length === 1
            ? siteConfig.labels.photo.toLowerCase()
            : siteConfig.labels.photos.toLowerCase()
        }.`,
      );
      fetchPhotos();
    } else {
      showError("Failed to apply caption.");
    }
  }

  // Drag-reorder only makes sense when showing in position order.
  const canReorder =
    sortKey === "position" &&
    filter === "all" &&
    !activeTag &&
    !search.trim();

  return (
    <div
      className="-m-8 min-h-[calc(100vh-0px)] bg-admin-bg transition-[padding] duration-200"
      style={{ paddingRight: selected.size > 0 ? 340 : 0 }}
    >
      <Topbar
        title={siteConfig.labels.photos}
        subtitle={
          currentGallery
            ? `${photos.length} in ${currentGallery.title}${
                needsTitleCount + needsLocationCount > 0
                  ? ` · ${needsTitleCount + needsLocationCount} need attention`
                  : ""
              }`
            : `Select a ${siteConfig.labels.gallery.toLowerCase()}`
        }
        actions={
          selectedGallery ? (
            <label
              className={cn(
                "inline-flex items-center gap-1.5 rounded-md font-medium whitespace-nowrap transition-transform active:translate-y-px px-3.5 py-2 text-[13px] cursor-pointer",
                uploading
                  ? "bg-admin-ink-faint text-admin-surface border border-admin-ink-faint cursor-wait"
                  : "bg-admin-ink text-admin-surface border border-admin-ink hover:opacity-90",
              )}
            >
              <Upload className="h-3.5 w-3.5" />
              {uploading ? "Uploading..." : "Upload"}
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleUpload}
                disabled={uploading}
                className="hidden"
              />
            </label>
          ) : null
        }
      />

      {/* Filter bar */}
      <div className="flex flex-col gap-3 border-b border-admin-border bg-admin-surface px-7 py-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <Select
              value={selectedGallery}
              onChange={(e) => setSelectedGallery(e.target.value)}
              className="w-auto min-w-[180px]"
            >
              <option value="">
                Select {siteConfig.labels.gallery.toLowerCase()}...
              </option>
              {galleries.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.title}
                </option>
              ))}
            </Select>
            {currentGallery && (
              <Link
                href={`/${siteConfig.labels.gallerySlug}/${currentGallery.slug}`}
                target="_blank"
                className="inline-flex items-center gap-1 text-[12px] text-admin-ink-soft hover:text-admin-ink"
              >
                <ExternalLink className="h-3 w-3" />
                View public page
              </Link>
            )}
          </div>

          {photos.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-admin-ink-faint pointer-events-none" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search..."
                  className="w-[200px] pl-8 h-[34px] text-[12px]"
                />
              </div>
              <Select
                value={sortKey}
                onChange={(e) => setSortKey(e.target.value as SortKey)}
                className="w-auto text-[12px] h-[34px]"
                aria-label="Sort"
              >
                <option value="position">Custom order</option>
                <option value="newest">Newest first</option>
                <option value="oldest">Oldest first</option>
                <option value="title">Title A–Z</option>
                <option value="filename">Filename A–Z</option>
              </Select>
            </div>
          )}
        </div>

        {photos.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            <FilterChip
              active={filter === "all"}
              onClick={() => setFilter("all")}
              label={`All · ${photos.length}`}
            />
            {needsTitleCount > 0 && (
              <FilterChip
                active={filter === "needs-title"}
                onClick={() => setFilter("needs-title")}
                label={`No title · ${needsTitleCount}`}
              />
            )}
            {needsLocationCount > 0 && (
              <FilterChip
                active={filter === "needs-location"}
                onClick={() => setFilter("needs-location")}
                label={`No location · ${needsLocationCount}`}
              />
            )}
            {uniqueTags.length > 0 && (
              <>
                <div className="mx-1 h-4 w-px bg-admin-border" />
                {uniqueTags.map((t) => (
                  <FilterChip
                    key={t}
                    active={activeTag === t}
                    onClick={() =>
                      setActiveTag(activeTag === t ? null : t)
                    }
                    label={`#${t}`}
                  />
                ))}
              </>
            )}
          </div>
        )}
      </div>

      <div className="p-7">
        {message && (
          <div className={`${alertClass} mb-4`}>{message.text}</div>
        )}

        {/* Selection bar */}
        {photos.length > 0 && (
          <div className="mb-4 flex items-center justify-between">
            <label className="flex cursor-pointer items-center gap-2 text-[13px] text-admin-ink-soft">
              <input
                type="checkbox"
                checked={
                  selected.size > 0 && selected.size === visible.length
                }
                ref={(el) => {
                  if (el)
                    el.indeterminate =
                      selected.size > 0 && selected.size < visible.length;
                }}
                onChange={(e) => {
                  if (e.target.checked)
                    setSelected(new Set(visible.map((p) => p.id)));
                  else clearSelection();
                }}
                className="accent-admin-accent"
              />
              {selected.size > 0
                ? `${selected.size} selected`
                : `Select all (${visible.length})`}
            </label>
            {selected.size > 0 && (
              <button
                onClick={clearSelection}
                className="text-[12px] text-admin-ink-soft hover:text-admin-ink"
              >
                Clear selection
              </button>
            )}
          </div>
        )}

        {/* Content states */}
        {!selectedGallery ? (
          <EmptyState
            title={`Select a ${siteConfig.labels.gallery.toLowerCase()}`}
            body={`Pick a ${siteConfig.labels.gallery.toLowerCase()} above to view and upload ${siteConfig.labels.photos.toLowerCase()}.`}
          />
        ) : loading ? (
          <div className="text-admin-ink-soft">Loading...</div>
        ) : photos.length === 0 ? (
          <EmptyState
            title={`No ${siteConfig.labels.photos.toLowerCase()} yet`}
            body={`Upload ${siteConfig.labels.photos.toLowerCase()} to get started.`}
          />
        ) : visible.length === 0 ? (
          <EmptyState
            title="No matches"
            body="Nothing matches the current filters. Clear them to see everything."
          />
        ) : canReorder ? (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={visible.map((p) => p.id)}
              strategy={rectSortingStrategy}
            >
              <div className="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-2.5">
                {visible.map((photo) => (
                  <SortablePhotoTile
                    key={photo.id}
                    photo={photo}
                    selected={selected.has(photo.id)}
                    onToggleSelect={() => toggleSelected(photo.id)}
                    onEdit={() => {
                      setEditingId(photo.id);
                      setEditingFocal({
                        x: photo.focalX ?? 50,
                        y: photo.focalY ?? 50,
                      });
                    }}
                    onSetCover={() => setCover(photo)}
                    onDelete={() => handleDelete(photo.id)}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        ) : (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-2.5">
            {visible.map((photo) => (
              <PhotoTile
                key={photo.id}
                photo={photo}
                selected={selected.has(photo.id)}
                onToggleSelect={() => toggleSelected(photo.id)}
                onEdit={() => {
                  setEditingId(photo.id);
                  setEditingFocal({
                    x: photo.focalX ?? 50,
                    y: photo.focalY ?? 50,
                  });
                }}
                onSetCover={() => setCover(photo)}
                onDelete={() => handleDelete(photo.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Edit modal */}
      {editingId && editingPhoto && (
        <EditPhotoModal
          photo={editingPhoto}
          focal={editingFocal}
          onFocalChange={(x, y) => setEditingFocal({ x, y })}
          onSubmit={handleUpdate}
          onClose={() => setEditingId(null)}
          onCopyUrl={() => {
            navigator.clipboard.writeText(editingPhoto.url);
            showSuccess("URL copied!");
          }}
        />
      )}

      {/* Bulk edit drawer */}
      {selected.size > 0 && (
        <PhotoBulkEditDrawer
          selectedPhotos={selectedPhotos.map((p) => ({
            id: p.id,
            thumbnailUrl: p.thumbnailUrl,
          }))}
          currentGalleryId={selectedGallery}
          galleries={galleries.map((g) => ({ id: g.id, title: g.title }))}
          onClose={clearSelection}
          onApply={handleBulkApply}
          onFillCaption={handleBulkFillCaption}
          onDelete={handleBulkDelete}
        />
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

function parseTagsInput(v: FormDataEntryValue | null): string[] {
  if (v == null) return [];
  return String(v)
    .split(",")
    .map((t) => t.trim())
    .filter((t) => t.length > 0);
}

function FilterChip({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "px-3 py-1 rounded-full text-[12px] border transition-colors",
        active
          ? "bg-admin-ink text-admin-surface border-admin-ink"
          : "bg-admin-surface-2 text-admin-ink-soft border-admin-border hover:text-admin-ink",
      )}
    >
      {label}
    </button>
  );
}

interface PhotoTileProps {
  photo: Photo;
  selected: boolean;
  onToggleSelect: () => void;
  onEdit: () => void;
  onSetCover: () => void;
  onDelete: () => void;
}

function SortablePhotoTile(props: PhotoTileProps) {
  return (
    <SortableGridItem id={props.photo.id}>
      {(drag) => (
        <PhotoTileInner {...props} drag={drag} />
      )}
    </SortableGridItem>
  );
}

function PhotoTile(props: PhotoTileProps) {
  return <PhotoTileInner {...props} />;
}

type DragHandle = {
  attributes: ReturnType<typeof useSortable>["attributes"];
  listeners: ReturnType<typeof useSortable>["listeners"];
  isDragging: boolean;
};

function PhotoTileInner({
  photo,
  selected,
  onToggleSelect,
  onEdit,
  onSetCover,
  onDelete,
  drag,
}: PhotoTileProps & { drag?: DragHandle }) {
  const needsAttention =
    !photo.title?.trim() ? "no title"
      : !photo.location?.trim() ? "no location"
      : null;
  const isDragging = drag?.isDragging ?? false;

  return (
    <div
      onClick={(e) => {
        if (isDragging) return;
        if ((e.target as HTMLElement).closest("[data-action]")) return;
        if ((e.target as HTMLElement).closest("[data-drag-handle]")) return;
        onToggleSelect();
      }}
      className={cn(
        "group relative aspect-square overflow-hidden rounded-md select-none border-2 transition-[border-color,transform] duration-150",
        isDragging ? "cursor-grabbing" : "cursor-pointer",
        selected
          ? "border-admin-accent"
          : "border-transparent hover:border-admin-border-strong",
      )}
      aria-pressed={selected}
    >
      <Image
        src={photo.thumbnailUrl}
        alt={photo.title ?? photo.filename ?? ""}
        fill
        sizes="(min-width: 1024px) 200px, 50vw"
        className={cn(
          "object-cover transition-opacity",
          selected && "opacity-85",
        )}
      />

      <div
        className={cn(
          "absolute top-2 left-2 h-5 w-5 rounded flex items-center justify-center text-[11px] font-bold text-white border transition-colors",
          selected
            ? "bg-admin-accent border-admin-accent"
            : "bg-black/20 border-white/80 opacity-0 group-hover:opacity-100",
        )}
      >
        {selected && "✓"}
      </div>

      {/* Drag handle (only rendered when tile is sortable) */}
      {drag && (
        <div
          data-drag-handle
          {...drag.attributes}
          {...drag.listeners}
          title="Drag to reorder"
          aria-label="Drag to reorder"
          className={cn(
            "absolute left-2 top-1/2 -translate-y-1/2 h-8 w-5 flex items-center justify-center rounded bg-black/40 text-white/90 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity",
            isDragging ? "cursor-grabbing opacity-100" : "cursor-grab",
          )}
        >
          <GripVertical className="h-4 w-4" />
        </div>
      )}

      {needsAttention && !selected && (
        <div className="absolute top-2 right-2 inline-flex items-center gap-1 rounded-full bg-[#fdf3d8] text-[#8a6612] text-[9px] font-semibold uppercase tracking-[0.5px] px-2 py-0.5">
          <AlertCircle className="h-2.5 w-2.5" />
          {needsAttention}
        </div>
      )}

      <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <IconAction
          title="Set as gallery cover"
          onClick={onSetCover}
          Icon={Star}
        />
        <IconAction title="Edit" onClick={onEdit} Icon={Pencil} />
        <IconAction title="Delete" onClick={onDelete} Icon={Trash2} danger />
      </div>

      <div className="absolute inset-x-0 bottom-0 px-3 pt-4 pb-2 bg-gradient-to-t from-black/60 to-transparent text-white text-[11px] flex justify-between items-end gap-2 pointer-events-none">
        <span className="truncate font-medium">
          {photo.title || photo.filename || "Untitled"}
        </span>
        <span className="opacity-70 shrink-0">
          {photo.width}×{photo.height}
        </span>
      </div>
    </div>
  );
}

function IconAction({
  title,
  onClick,
  Icon,
  danger = false,
}: {
  title: string;
  onClick: () => void;
  Icon: React.ComponentType<{ className?: string }>;
  danger?: boolean;
}) {
  return (
    <button
      data-action
      title={title}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      onPointerDown={(e) => e.stopPropagation()}
      className={cn(
        "h-6 w-6 flex items-center justify-center rounded-md bg-white/90 text-admin-ink-soft hover:bg-white hover:text-admin-ink backdrop-blur-sm transition-colors",
        danger && "hover:text-admin-danger",
      )}
    >
      <Icon className="h-3 w-3" />
    </button>
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

function EditPhotoModal({
  photo,
  focal,
  onFocalChange,
  onSubmit,
  onClose,
  onCopyUrl,
}: {
  photo: Photo;
  focal: { x: number; y: number };
  onFocalChange: (x: number, y: number) => void;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  onClose: () => void;
  onCopyUrl: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-2xl overflow-hidden rounded-lg bg-admin-surface border border-admin-border shadow-2xl">
        <div className="flex items-center justify-between border-b border-admin-border px-5 py-4">
          <div className="min-w-0">
            <SectionLabel>Edit {siteConfig.labels.photo.toLowerCase()}</SectionLabel>
            <div className="mt-1 font-serif italic text-[20px] leading-none text-admin-ink truncate">
              {photo.title || photo.filename || "Untitled"}
            </div>
          </div>
          <button
            onClick={onClose}
            className="shrink-0 rounded-md p-1.5 text-admin-ink-soft hover:bg-admin-surface-2 hover:text-admin-ink"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form
          onSubmit={onSubmit}
          className="p-5 grid grid-cols-1 md:grid-cols-[200px_minmax(0,1fr)] gap-6"
        >
          <div className="min-w-0">
            <SectionLabel className="mb-2">Focal point</SectionLabel>
            <FocalPointPicker
              imageUrl={photo.thumbnailUrl}
              focalX={focal.x}
              focalY={focal.y}
              onChange={(x, y) => onFocalChange(x, y)}
            />
          </div>

          <div className="flex min-w-0 flex-col gap-4">
            <div className="flex items-center gap-2 rounded-md bg-admin-surface-2 border border-admin-border px-3 py-2 min-w-0">
              <span className="font-mono text-[10px] uppercase tracking-[1.5px] text-admin-ink-soft shrink-0">
                URL
              </span>
              <code className="flex-1 min-w-0 truncate text-[11px] text-admin-ink-soft">
                {photo.url}
              </code>
              <Button
                kind="ghost"
                size="sm"
                type="button"
                onClick={onCopyUrl}
                className="shrink-0"
              >
                <Copy className="h-3 w-3" />
                Copy
              </Button>
            </div>

            <Field label="Filename" htmlFor="p-filename">
              <Input
                id="p-filename"
                name="filename"
                defaultValue={photo.filename ?? ""}
              />
            </Field>
            <Field label="Title" htmlFor="p-title">
              <Input
                id="p-title"
                name="title"
                defaultValue={photo.title ?? ""}
              />
            </Field>
            <Field label="Description" htmlFor="p-description">
              <Input
                id="p-description"
                name="description"
                defaultValue={photo.description ?? ""}
              />
            </Field>
            <Field label="Location" htmlFor="p-location" hint="Human-readable name (e.g. 'Paris, France')">
              <Input
                id="p-location"
                name="location"
                defaultValue={photo.location ?? ""}
              />
            </Field>
            <Field label="Tags" htmlFor="p-tags" hint="Comma-separated (e.g. 'Paris, France, Europe')">
              <Input
                id="p-tags"
                name="tags"
                defaultValue={photo.tags?.join(", ") ?? ""}
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Latitude" htmlFor="p-lat" hint="Decimal (e.g. 48.8566)">
                <Input
                  id="p-lat"
                  name="latitude"
                  type="number"
                  step="any"
                  min={-90}
                  max={90}
                  defaultValue={photo.latitude ?? ""}
                  placeholder=""
                />
              </Field>
              <Field label="Longitude" htmlFor="p-lng" hint="Decimal (e.g. 2.3522)">
                <Input
                  id="p-lng"
                  name="longitude"
                  type="number"
                  step="any"
                  min={-180}
                  max={180}
                  defaultValue={photo.longitude ?? ""}
                  placeholder=""
                />
              </Field>
            </div>
            <div className="flex gap-2 pt-2">
              <Button type="submit" kind="primary">
                Update
              </Button>
              <Button type="button" kind="ghost" onClick={onClose}>
                Cancel
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
