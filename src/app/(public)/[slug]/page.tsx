import { db } from "@/lib/db";
import { pages, galleries, photos, siteSettings } from "@/lib/db/schema";
import { eq, and, asc } from "drizzle-orm";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { generateHTML } from "@tiptap/html";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import TextAlign from "@tiptap/extension-text-align";
import Underline from "@tiptap/extension-underline";
import PuckRenderer from "@/components/public/PuckRenderer";
import type { Data } from "@puckeditor/core";
import type { EmbedPhoto, GlobalLightboxSettings } from "@/lib/puck/config";

interface Props {
  params: Promise<{ slug: string }>;
}

// Tiptap extensions for legacy content
const tiptapExtensions = [
  StarterKit,
  Underline,
  Image,
  Link,
  TextAlign.configure({ types: ["heading", "paragraph"] }),
];

function isPuckData(content: unknown): content is Data {
  return (
    typeof content === "object" &&
    content !== null &&
    "root" in content &&
    "content" in content
  );
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const [page] = await db
    .select()
    .from(pages)
    .where(and(eq(pages.slug, slug), eq(pages.isPublished, true)));

  if (!page) return {};

  return {
    title: page.metaTitle ?? page.title,
    description: page.metaDescription ?? undefined,
    openGraph: {
      title: page.metaTitle ?? page.title,
      description: page.metaDescription ?? undefined,
      images: page.ogImageUrl ? [page.ogImageUrl] : undefined,
    },
  };
}

export default async function DynamicPage({ params }: Props) {
  const { slug } = await params;

  const [page] = await db
    .select()
    .from(pages)
    .where(and(eq(pages.slug, slug), eq(pages.isPublished, true)));

  if (!page) notFound();

  // New Puck-based content
  if (isPuckData(page.content)) {
    // Fetch global lightbox settings
    const [settingsRow] = await db.select().from(siteSettings).limit(1);
    const globalLightbox: GlobalLightboxSettings = {
      metadataFields: settingsRow?.lightboxMetadataFields ?? ["title", "location"],
      cornerRadius: settingsRow?.lightboxCornerRadius ?? 0,
      captionPosition: (settingsRow?.lightboxCaptionPosition ?? "below") as GlobalLightboxSettings["captionPosition"],
      fadeSpeed: (settingsRow?.lightboxFadeSpeed ?? "medium") as GlobalLightboxSettings["fadeSpeed"],
      captionAlignment: (settingsRow?.lightboxCaptionAlignment ?? "left") as GlobalLightboxSettings["captionAlignment"],
    };

    // Prefetch photos for any GalleryEmbed components
    const galleryPhotos: Record<string, EmbedPhoto[]> = {};
    const embedItems = (page.content.content ?? []).filter(
      (item: { type: string }) => item.type === "GalleryEmbed"
    );
    for (const item of embedItems) {
      const props = item.props as { gallerySlug?: string; maxPhotos?: number };
      if (!props.gallerySlug) continue;
      const [gallery] = await db
        .select()
        .from(galleries)
        .where(and(eq(galleries.slug, props.gallerySlug), eq(galleries.isPublished, true)));
      if (!gallery) continue;
      const galleryPhotoRows = await db
        .select()
        .from(photos)
        .where(eq(photos.galleryId, gallery.id))
        .orderBy(asc(photos.position));
      galleryPhotos[props.gallerySlug] = galleryPhotoRows
        .slice(0, props.maxPhotos ?? 12)
        .map((p) => ({
          id: p.id,
          url: p.url,
          thumbnailUrl: p.thumbnailUrl ?? p.url,
          filename: p.title ?? null,
          title: p.title,
          description: p.description,
          location: p.location,
          cameraSettings: p.cameraSettings as EmbedPhoto["cameraSettings"],
          width: p.width ?? 800,
          height: p.height ?? 600,
          focalX: p.focalX ?? 50,
          focalY: p.focalY ?? 50,
        }));
    }

    return (
      <div className="mx-auto max-w-5xl px-4 py-12">
        {page.showTitle && (
          <h1 className="mb-8 text-center text-4xl font-semibold tracking-tight" style={{ fontFamily: "var(--theme-font-headings)" }}>
            {page.title}
          </h1>
        )}
        <PuckRenderer data={page.content} galleryPhotos={galleryPhotos} globalLightbox={globalLightbox} />
      </div>
    );
  }

  // Legacy Tiptap content (for pages created before Puck migration)
  const html = page.content
    ? generateHTML(page.content as Parameters<typeof generateHTML>[0], tiptapExtensions)
    : "";

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      {page.showTitle && (
        <h1 className="mb-8 text-center text-4xl font-semibold tracking-tight">
          {page.title}
        </h1>
      )}
      {html ? (
        <div
          className="prose prose-lg mx-auto"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      ) : (
        <p className="text-center text-neutral-500">This page has no content yet.</p>
      )}
    </div>
  );
}
