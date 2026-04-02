import { db } from "@/lib/db";
import { galleries, photos, siteSettings } from "@/lib/db/schema";
import { eq, asc, and } from "drizzle-orm";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { DEFAULT_LIGHTBOX_SETTINGS, type LightboxSettings } from "@/components/public/Lightbox";
import GalleryGrid from "./GalleryGrid";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const [gallery] = await db
    .select()
    .from(galleries)
    .where(and(eq(galleries.slug, slug), eq(galleries.isPublished, true)));

  if (!gallery) return {};

  return {
    title: gallery.title,
    description: gallery.description ?? undefined,
    openGraph: {
      title: gallery.title,
      description: gallery.description ?? undefined,
      images: gallery.coverImageUrl ? [gallery.coverImageUrl] : undefined,
    },
  };
}

export default async function GalleryPage({ params }: Props) {
  const { slug } = await params;

  const [gallery] = await db
    .select()
    .from(galleries)
    .where(and(eq(galleries.slug, slug), eq(galleries.isPublished, true)));

  if (!gallery) notFound();

  const [galleryPhotos, [settingsRow]] = await Promise.all([
    db.select().from(photos).where(eq(photos.galleryId, gallery.id)).orderBy(asc(photos.position)),
    db.select().from(siteSettings).limit(1),
  ]);

  const lightboxSettings: LightboxSettings = {
    metadataFields: settingsRow?.lightboxMetadataFields ?? DEFAULT_LIGHTBOX_SETTINGS.metadataFields,
    cornerRadius: settingsRow?.lightboxCornerRadius ?? DEFAULT_LIGHTBOX_SETTINGS.cornerRadius,
    captionPosition: (settingsRow?.lightboxCaptionPosition ?? DEFAULT_LIGHTBOX_SETTINGS.captionPosition) as LightboxSettings["captionPosition"],
    fadeSpeed: (settingsRow?.lightboxFadeSpeed ?? DEFAULT_LIGHTBOX_SETTINGS.fadeSpeed) as LightboxSettings["fadeSpeed"],
    captionAlignment: (settingsRow?.lightboxCaptionAlignment ?? DEFAULT_LIGHTBOX_SETTINGS.captionAlignment) as LightboxSettings["captionAlignment"],
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-12">
      <div className="mb-8 text-center">
        <h1 className="text-4xl font-semibold tracking-tight">{gallery.title}</h1>
        {gallery.description && (
          <p className="mt-3 text-lg text-neutral-600">{gallery.description}</p>
        )}
      </div>

      {galleryPhotos.length === 0 ? (
        <p className="text-center text-neutral-500">No photos in this gallery yet.</p>
      ) : (
        <GalleryGrid photos={galleryPhotos} lightboxSettings={lightboxSettings} />
      )}
    </div>
  );
}
