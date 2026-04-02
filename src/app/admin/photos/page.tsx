"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useSearchParams } from "next/navigation";
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
import FocalPointPicker from "@/components/admin/FocalPointPicker";
import Link from "next/link";

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
  width: number;
  height: number;
  focalX: number;
  focalY: number;
  position: number;
}

interface Gallery {
  id: string;
  title: string;
  slug: string;
}

export default function PhotosPage() {
  const searchParams = useSearchParams();
  const galleryIdParam = searchParams.get("galleryId");

  const [photos, setPhotos] = useState<Photo[]>([]);
  const [galleries, setGalleries] = useState<Gallery[]>([]);
  const [selectedGallery, setSelectedGallery] = useState<string>(galleryIdParam ?? "");
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingFocal, setEditingFocal] = useState<{ x: number; y: number }>({ x: 50, y: 50 });
  const { message, showSuccess, showError, alertClass } = useMessage();

  const extraBody = useMemo(() => ({ galleryId: selectedGallery }), [selectedGallery]);

  const { sensors, handleDragEnd } = useSortableList({
    items: photos,
    setItems: setPhotos,
    endpoint: "/api/photos",
    onError: showError,
    extraBody,
  });

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

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    if (!selectedGallery || !e.target.files?.length) return;
    setUploading(true);

    const files = Array.from(e.target.files);
    let uploaded = 0;

    for (const file of files) {
      // Get image dimensions client-side
      const dimensions = await new Promise<{ width: number; height: number }>((resolve) => {
        const img = new window.Image();
        img.onload = () => { resolve({ width: img.naturalWidth, height: img.naturalHeight }); URL.revokeObjectURL(img.src); };
        img.src = URL.createObjectURL(file);
      });

      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", "galleries");

      const uploadRes = await fetch("/api/upload", { method: "POST", body: formData });
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

    showSuccess(`${uploaded} photo${uploaded !== 1 ? "s" : ""} uploaded!`);
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
        focalX: editingFocal.x,
        focalY: editingFocal.y,
      }),
    });

    if (res.ok) {
      setEditingId(null);
      showSuccess("Photo updated!");
      fetchPhotos();
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this photo?")) return;
    const res = await fetch(`/api/photos?id=${id}`, { method: "DELETE" });
    if (res.ok) {
      showSuccess("Photo deleted");
      fetchPhotos();
    } else {
      showError("Failed to delete photo");
    }
  }

  async function setCover(photo: Photo) {
    const res = await fetch("/api/galleries", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: selectedGallery, coverImageUrl: photo.thumbnailUrl }),
    });
    if (res.ok) {
      showSuccess("Cover image updated!");
    } else {
      showError("Failed to set cover image");
    }
  }

  const editingPhoto = photos.find((p) => p.id === editingId);
  const currentGallery = galleries.find((g) => g.id === selectedGallery);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold">Photos</h1>
          <select
            value={selectedGallery}
            onChange={(e) => setSelectedGallery(e.target.value)}
            className="rounded border border-neutral-300 px-3 py-1.5 text-sm focus:border-neutral-500 focus:outline-none"
          >
            <option value="">Select gallery...</option>
            {galleries.map((g) => (
              <option key={g.id} value={g.id}>{g.title}</option>
            ))}
          </select>
          {currentGallery && (
            <Link
              href={`/gallery/${currentGallery.slug}`}
              className="text-sm text-neutral-400 hover:text-neutral-600"
              target="_blank"
            >
              View public page
            </Link>
          )}
        </div>
        {selectedGallery && (
          <label className={`cursor-pointer rounded px-4 py-2 text-sm text-white ${uploading ? "bg-neutral-400" : "bg-neutral-900 hover:bg-neutral-700"}`}>
            {uploading ? "Uploading..." : "Upload Photos"}
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handleUpload}
              disabled={uploading}
              className="hidden"
            />
          </label>
        )}
      </div>

      {message && (
        <div className={alertClass}>
          {message.text}
        </div>
      )}

      {editingId && editingPhoto && (
        <form
          onSubmit={handleUpdate}
          className="mb-6 rounded-lg border border-neutral-200 bg-white p-4"
        >
          <h2 className="mb-3 text-sm font-medium">Edit Photo</h2>
          <div className="flex gap-4">
            <div className="w-48 shrink-0">
              <FocalPointPicker
                imageUrl={editingPhoto.thumbnailUrl}
                focalX={editingFocal.x}
                focalY={editingFocal.y}
                onChange={(x, y) => setEditingFocal({ x, y })}
              />
            </div>
            <div className="flex-1 space-y-3">
              <div className="flex items-center gap-2 rounded border border-neutral-200 bg-neutral-50 px-3 py-2">
                <span className="shrink-0 text-xs font-medium text-neutral-500">URL</span>
                <code className="flex-1 truncate text-xs text-neutral-600">{editingPhoto.url}</code>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(editingPhoto.url);
                    showSuccess("URL copied!");
                  }}
                  className="shrink-0 rounded bg-neutral-200 px-2 py-0.5 text-xs text-neutral-600 hover:bg-neutral-300"
                >
                  Copy
                </button>
              </div>
              <input
                name="filename"
                placeholder="Filename"
                defaultValue={editingPhoto.filename ?? ""}
                className="input-base"
              />
              <input
                name="title"
                placeholder="Title"
                defaultValue={editingPhoto.title ?? ""}
                className="input-base"
              />
              <input
                name="description"
                placeholder="Description"
                defaultValue={editingPhoto.description ?? ""}
                className="input-base"
              />
              <input
                name="location"
                placeholder="Location"
                defaultValue={editingPhoto.location ?? ""}
                className="input-base"
              />
              <div className="flex gap-2">
                <button type="submit" className="btn-primary">Update</button>
                <button type="button" onClick={() => setEditingId(null)} className="btn-secondary">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </form>
      )}

      {!selectedGallery ? (
        <p className="text-sm text-neutral-500">Select a gallery to manage its photos.</p>
      ) : loading ? (
        <div className="text-neutral-500">Loading...</div>
      ) : photos.length === 0 ? (
        <p className="text-sm text-neutral-500">No photos in this gallery yet. Upload some to get started.</p>
      ) : (
        <div className="rounded-lg border border-neutral-200 bg-white">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={photos.map((p) => p.id)} strategy={verticalListSortingStrategy}>
              {photos.map((photo) => (
                <SortableItem key={photo.id} id={photo.id}>
                  <div className="flex items-center justify-between border-b border-neutral-100 px-4 py-3 last:border-0">
                    <div className="flex items-center gap-3">
                      <img
                        src={photo.thumbnailUrl}
                        alt={photo.title ?? ""}
                        className="h-12 w-12 rounded object-cover"
                      />
                      <div>
                        <span className="font-medium">{photo.title || photo.filename || "Untitled"}</span>
                        <span className="ml-2 text-sm text-neutral-400">
                          {photo.width}x{photo.height}
                        </span>
                        {photo.description && (
                          <span className="ml-2 text-sm text-neutral-400">{photo.description}</span>
                        )}
                        <div className="mt-0.5 flex items-center gap-1">
                          <code className="text-xs text-neutral-400 truncate max-w-xs">{photo.url}</code>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigator.clipboard.writeText(photo.url);
                              showSuccess("URL copied!");
                            }}
                            className="shrink-0 btn-text"
                            title="Copy URL"
                          >
                            Copy
                          </button>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setCover(photo)}
                        className="btn-text"
                        title="Set as gallery cover"
                      >
                        Cover
                      </button>
                      <button
                        onClick={() => {
                          setEditingId(photo.id);
                          setEditingFocal({ x: photo.focalX ?? 50, y: photo.focalY ?? 50 });
                        }}
                        className="btn-text"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(photo.id)}
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
