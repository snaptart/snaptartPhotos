import { db } from "@/lib/db";
import { pages, galleries, photos, siteSettings } from "@/lib/db/schema";
import { eq, and, asc } from "drizzle-orm";
import { generateHTML } from "@tiptap/html";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import TextAlign from "@tiptap/extension-text-align";
import Underline from "@tiptap/extension-underline";
import PuckRenderer from "@/components/public/PuckRenderer";
import type { Data } from "@puckeditor/core";
import type { EmbedPhoto, GlobalLightboxSettings } from "@/lib/puck/config";

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

export default async function HomePage() {
  const [settingsRow] = await db.select().from(siteSettings).limit(1);

  if (!settingsRow?.homepageId) {
    return (
      <div className="flex flex-col items-center justify-center px-4 py-24">
        <h1 className="mb-4 text-5xl font-light tracking-wide">SnaptArt</h1>
        <p className="text-lg text-neutral-500">
          Photography from Minnesota, France, and other places
        </p>
      </div>
    );
  }

  const [page] = await db
    .select()
    .from(pages)
    .where(and(eq(pages.id, settingsRow.homepageId), eq(pages.isPublished, true)));

  if (!page) {
    return (
      <div className="flex flex-col items-center justify-center px-4 py-24">
        <h1 className="mb-4 text-5xl font-light tracking-wide">SnaptArt</h1>
        <p className="text-lg text-neutral-500">
          Photography from Minnesota, France, and other places
        </p>
      </div>
    );
  }

  if (isPuckData(page.content)) {
    const globalLightbox: GlobalLightboxSettings = {
      metadataFields: settingsRow?.lightboxMetadataFields ?? ["title", "location"],
      cornerRadius: settingsRow?.lightboxCornerRadius ?? 0,
      captionPosition: (settingsRow?.lightboxCaptionPosition ?? "below") as GlobalLightboxSettings["captionPosition"],
      fadeSpeed: (settingsRow?.lightboxFadeSpeed ?? "medium") as GlobalLightboxSettings["fadeSpeed"],
      captionAlignment: (settingsRow?.lightboxCaptionAlignment ?? "left") as GlobalLightboxSettings["captionAlignment"],
    };

    const galleryPhotos: Record<string, EmbedPhoto[]> = {};
    const embedItems = (page.content.content ?? []).filter(
      (item: { type: string }) => item.type === "GalleryEmbed" || item.type === "HeroSlideshow"
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
