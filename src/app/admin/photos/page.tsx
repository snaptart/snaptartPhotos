"use client";

import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { SortableItem } from "@/components/admin/SortableItem";
import Link from "next/link";

interface Photo {
  id: string;
  galleryId: string;
  blobUrl: string;
  url: string;
  thumbnailUrl: string;
  title: string | null;
  description: string | null;
  location: string | null;
  width: number;
  height: number;
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
  const [message, setMessage] = useState("");

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

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
    setMessage("");

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
        setMessage(`Failed to upload ${file.name}`);
        continue;
      }

      const { blobUrl, url } = await uploadRes.json();

      await fetch("/api/photos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          galleryId: selectedGallery,
          blobUrl,
          url,
          thumbnailUrl: url,
          width: dimensions.width,
          height: dimensions.height,
          title: file.name.replace(/\.[^.]+$/, ""),
          position: photos.length + uploaded,
        }),
      });
      uploaded++;
    }

    setMessage(`${uploaded} photo${uploaded !== 1 ? "s" : ""} uploaded!`);
    setUploading(false);
    e.target.value = "";
    fetchPhotos();
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = photos.findIndex((p) => p.id === active.id);
    const newIndex = photos.findIndex((p) => p.id === over.id);
    const reordered = arrayMove(photos, oldIndex, newIndex);
    setPhotos(reordered);

    await fetch("/api/photos", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        galleryId: selectedGallery,
        items: reordered.map((p, index) => ({ id: p.id, position: index })),
      }),
    });
  }

  async function handleUpdate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);

    const res = await fetch("/api/photos", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: editingId,
        title: form.get("title") || null,
        description: form.get("description") || null,
        location: form.get("location") || null,
      }),
    });

    if (res.ok) {
      setEditingId(null);
      setMessage("Photo updated!");
      fetchPhotos();
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this photo?")) return;
    await fetch(`/api/photos?id=${id}`, { method: "DELETE" });
    setMessage("Photo deleted");
    fetchPhotos();
  }

  async function setCover(photo: Photo) {
    await fetch("/api/galleries", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: selectedGallery, coverImageUrl: photo.thumbnailUrl }),
    });
    setMessage("Cover image updated!");
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
        <div className={`mb-4 rounded px-3 py-2 text-sm ${message.includes("Failed") ? "bg-red-50 text-red-600" : "bg-green-50 text-green-600"}`}>
          {message}
        </div>
      )}

      {editingId && editingPhoto && (
        <form
          onSubmit={handleUpdate}
          className="mb-6 rounded-lg border border-neutral-200 bg-white p-4"
        >
          <h2 className="mb-3 text-sm font-medium">Edit Photo</h2>
          <div className="flex gap-4">
            <img src={editingPhoto.thumbnailUrl} alt="" className="h-20 w-20 rounded object-cover" />
            <div className="flex-1 space-y-3">
              <input
                name="title"
                placeholder="Title"
                defaultValue={editingPhoto.title ?? ""}
                className="w-full rounded border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none"
              />
              <input
                name="description"
                placeholder="Description"
                defaultValue={editingPhoto.description ?? ""}
                className="w-full rounded border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none"
              />
              <input
                name="location"
                placeholder="Location"
                defaultValue={editingPhoto.location ?? ""}
                className="w-full rounded border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none"
              />
              <div className="flex gap-2">
                <button type="submit" className="rounded bg-neutral-900 px-4 py-2 text-sm text-white hover:bg-neutral-700">
                  Update
                </button>
                <button type="button" onClick={() => setEditingId(null)} className="rounded border border-neutral-300 px-4 py-2 text-sm hover:bg-neutral-50">
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
                        <span className="font-medium">{photo.title ?? "Untitled"}</span>
                        <span className="ml-2 text-sm text-neutral-400">
                          {photo.width}x{photo.height}
                        </span>
                        {photo.location && (
                          <span className="ml-2 text-sm text-neutral-400">{photo.location}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setCover(photo)}
                        className="text-sm text-neutral-500 hover:text-neutral-900"
                        title="Set as gallery cover"
                      >
                        Cover
                      </button>
                      <button
                        onClick={() => setEditingId(photo.id)}
                        className="text-sm text-neutral-500 hover:text-neutral-900"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(photo.id)}
                        className="text-sm text-red-500 hover:text-red-700"
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
