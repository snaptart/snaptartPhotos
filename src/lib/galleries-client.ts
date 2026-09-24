"use client";

import { useEffect, useState } from "react";

/** A row of GET /api/galleries, as the public blocks use it. */
export type GalleryListRow = { slug: string; title: string; position: number; isPublished: boolean; href?: string };

let request: Promise<GalleryListRow[]> | null = null;

/** The gallery list, fetched once per page load and shared by every block that asks. */
export function fetchGalleries(): Promise<GalleryListRow[]> {
  request ??= fetch("/api/galleries")
    .then((r) => (r.ok ? r.json() : []))
    .then((data) => (Array.isArray(data) ? (data as GalleryListRow[]) : []))
    .catch(() => {
      request = null;
      return [];
    });
  return request;
}

/** The title of the gallery with this slug, once the list has loaded. */
export function useGalleryTitle(slug: string | null | undefined): string | null {
  const [title, setTitle] = useState<string | null>(null);
  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    fetchGalleries().then((rows) => {
      if (!cancelled) setTitle(rows.find((g) => g.slug === slug)?.title ?? null);
    });
    return () => {
      cancelled = true;
    };
  }, [slug]);
  return slug ? title : null;
}
