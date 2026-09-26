import { db } from "@/lib/db";
import { shareImagesOr } from "@/lib/site-icon";
import { galleries, siteSettings } from "@/lib/db/schema";
import { selectPhotosForGallery } from "@/lib/db/photo-queries";
import { eq, and } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";
import { builtCollectionPages } from "@/lib/collections";
import type { Metadata } from "next";
import { DEFAULT_LIGHTBOX_SETTINGS, type LightboxSettings } from "@/components/public/Lightbox";
import GalleryGrid from "./GalleryGrid";
import siteConfig from "@/lib/site.config";
import { fontRole } from "@/lib/theme/role-style";
import { PAGE_CONTAINER } from "@/lib/theme/layout";

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
      images: await shareImagesOr(gallery.coverImageUrl),
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

  // A collection with a page of its own is shown there; this template is the
  // fallback for the ones without. Old links, menu items and carousel links
  // still point here, so send them on.
  if ((await builtCollectionPages([slug])).has(slug)) redirect(`/${slug}`);

  const [galleryPhotos, [settingsRow]] = await Promise.all([
    selectPhotosForGallery(gallery.id),
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
    <div className={`${PAGE_CONTAINER} py-16`}>
      <div
        className="mb-12 border-b pb-8"
        style={{ borderColor: "var(--theme-color-rule)" }}
      >
        <h1 className="text-4xl md:text-5xl" style={fontRole("headings")}>
          {gallery.title}
        </h1>
        {gallery.description && (
          <p
            className="mt-5 max-w-2xl text-lg leading-relaxed"
            style={{ color: "var(--theme-color-gallery-captions)" }}
          >
            {gallery.description}
          </p>
        )}
      </div>

      {galleryPhotos.length === 0 ? (
        <p style={{ color: "var(--theme-color-gallery-captions)" }}>No {siteConfig.labels.photos.toLowerCase()} in this {siteConfig.labels.gallery.toLowerCase()} yet.</p>
      ) : (
        <GalleryGrid photos={galleryPhotos} lightboxSettings={lightboxSettings} collectionTitle={gallery.title} />
      )}
    </div>
  );
}
