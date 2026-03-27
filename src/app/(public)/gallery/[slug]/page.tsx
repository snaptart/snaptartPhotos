import { db } from "@/lib/db";
import { galleries, photos } from "@/lib/db/schema";
import { eq, asc, and } from "drizzle-orm";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
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

  const galleryPhotos = await db
    .select()
    .from(photos)
    .where(eq(photos.galleryId, gallery.id))
    .orderBy(asc(photos.position));

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
        <GalleryGrid photos={galleryPhotos} />
      )}
    </div>
  );
}
