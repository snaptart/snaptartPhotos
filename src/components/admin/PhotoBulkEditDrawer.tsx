"use client";

import { useState } from "react";
import Image from "next/image";
import { X, Trash2 } from "lucide-react";
import {
  Button,
  Field,
  Input,
  Select,
  Textarea,
  SectionLabel,
  Pill,
} from "@/components/admin/ui";

interface Gallery {
  id: string;
  title: string;
}

interface SelectedPhoto {
  id: string;
  thumbnailUrl: string;
}

interface BulkPatch {
  galleryId?: string;
  addToGalleryId?: string;
  location?: string | null;
  tags?: string[];
}

interface Props {
  selectedPhotos: SelectedPhoto[];
  currentGalleryId: string;
  galleries: Gallery[];
  onClose: () => void;
  onApply: (patch: BulkPatch) => Promise<void>;
  onFillCaption: (caption: string) => Promise<void>;
  onDelete: () => Promise<void>;
}

export function PhotoBulkEditDrawer({
  selectedPhotos,
  currentGalleryId,
  galleries,
  onClose,
  onApply,
  onFillCaption,
  onDelete,
}: Props) {
  const [moveToGalleryId, setMoveToGalleryId] = useState("");
  const [addToGalleryId, setAddToGalleryId] = useState("");
  const [location, setLocation] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [sharedCaption, setSharedCaption] = useState("");
  const [applying, setApplying] = useState(false);
  const [captioning, setCaptioning] = useState(false);

  const count = selectedPhotos.length;
  const hasOverwriteChange =
    !!moveToGalleryId ||
    !!addToGalleryId ||
    !!location.trim() ||
    !!tagsInput.trim();

  async function handleApply() {
    if (!hasOverwriteChange) return;
    setApplying(true);
    const patch: BulkPatch = {};
    if (moveToGalleryId) patch.galleryId = moveToGalleryId;
    if (addToGalleryId) patch.addToGalleryId = addToGalleryId;
    if (location.trim()) patch.location = location.trim();
    if (tagsInput.trim()) {
      patch.tags = tagsInput
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);
    }
    await onApply(patch);
    setMoveToGalleryId("");
    setAddToGalleryId("");
    setLocation("");
    setTagsInput("");
    setApplying(false);
  }

  async function handleFillCaption() {
    if (!sharedCaption.trim()) return;
    setCaptioning(true);
    await onFillCaption(sharedCaption.trim());
    setSharedCaption("");
    setCaptioning(false);
  }

  return (
    <aside className="fixed right-0 top-0 z-40 flex h-screen w-[340px] flex-col border-l border-admin-border bg-admin-surface shadow-[0_0_40px_rgba(0,0,0,0.08)]">
      <header className="flex items-start justify-between gap-3 border-b border-admin-border px-5 py-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <SectionLabel>Bulk edit</SectionLabel>
            <Pill tone="accent">Bulk</Pill>
          </div>
          <div className="font-serif italic text-[20px] leading-none text-admin-ink mt-1">
            {count} selected
          </div>
          <div className="text-[11px] text-admin-ink-soft mt-1">
            Changes apply to all selected.
          </div>
        </div>
        <button
          onClick={onClose}
          className="shrink-0 p-1.5 text-admin-ink-soft hover:text-admin-ink rounded-md hover:bg-admin-surface-2"
          aria-label="Close bulk edit"
        >
          <X className="h-4 w-4" />
        </button>
      </header>

      <div className="flex-1 overflow-y-auto">
        {/* Thumbnails preview */}
        {count > 0 && (
          <div className="px-5 pt-4">
            <SectionLabel className="mb-2">Selection</SectionLabel>
            <div className="flex flex-wrap gap-1.5">
              {selectedPhotos.slice(0, 8).map((p) => (
                <div
                  key={p.id}
                  className="relative h-12 w-12 overflow-hidden rounded bg-admin-surface-2 border border-admin-border"
                >
                  <Image
                    src={p.thumbnailUrl}
                    alt=""
                    fill
                    sizes="48px"
                    className="object-cover"
                  />
                </div>
              ))}
              {count > 8 && (
                <div className="flex h-12 w-12 items-center justify-center rounded border border-dashed border-admin-border text-[11px] text-admin-ink-soft">
                  +{count - 8}
                </div>
              )}
            </div>
          </div>
        )}

        <div className="p-5 space-y-5">
          <Field
            label="Move to gallery"
            hint="Replaces gallery memberships — photo will be in this gallery only."
          >
            <Select
              value={moveToGalleryId}
              onChange={(e) => setMoveToGalleryId(e.target.value)}
            >
              <option value="">— keep current —</option>
              {galleries
                .filter((g) => g.id !== currentGalleryId)
                .map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.title}
                  </option>
                ))}
            </Select>
          </Field>

          <Field
            label="Add to gallery"
            hint="Adds this gallery to existing memberships — photo stays in its current galleries too."
          >
            <Select
              value={addToGalleryId}
              onChange={(e) => setAddToGalleryId(e.target.value)}
            >
              <option value="">— don't add —</option>
              {galleries
                .filter((g) => g.id !== currentGalleryId)
                .map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.title}
                  </option>
                ))}
            </Select>
          </Field>

          <Field
            label="Location"
            hint="Overwrites location on every selected photo."
          >
            <Input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. Reykjavík, Iceland"
            />
          </Field>

          <Field
            label="Tags"
            hint="Comma-separated. Replaces existing tags on every selected photo."
          >
            <Input
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="travel, landscape, 2024"
            />
          </Field>

          <Button
            kind="primary"
            disabled={!hasOverwriteChange || applying}
            onClick={handleApply}
            className="w-full justify-center"
          >
            {applying ? "Applying..." : `Apply to ${count}`}
          </Button>

          {/* Shared caption — distinct fill-if-empty behavior */}
          <div className="border-t border-admin-border pt-5">
            <Field
              label="Shared caption"
              hint="Applied only to photos without an existing description."
            >
              <Textarea
                rows={3}
                value={sharedCaption}
                onChange={(e) => setSharedCaption(e.target.value)}
                placeholder="A caption for the whole set..."
              />
            </Field>
            <Button
              kind="ghost"
              disabled={!sharedCaption.trim() || captioning}
              onClick={handleFillCaption}
              className="w-full justify-center mt-3"
            >
              {captioning ? "Applying..." : "Fill blank captions"}
            </Button>
          </div>

          {/* Destructive actions */}
          <div className="border-t border-admin-border pt-5">
            <SectionLabel className="mb-3">Actions</SectionLabel>
            <Button
              kind="danger"
              icon={<Trash2 className="h-3.5 w-3.5" />}
              onClick={onDelete}
              className="w-full justify-center"
            >
              Delete selected
            </Button>
          </div>
        </div>
      </div>

      <footer className="border-t border-admin-border p-4">
        <Button
          kind="ghost"
          onClick={onClose}
          className="w-full justify-center"
        >
          Cancel
        </Button>
      </footer>
    </aside>
  );
}
