import { db } from "@/lib/db";
import { galleries, photos } from "@/lib/db/schema";
import { and, asc, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import RoomView, { type RoomPhoto } from "@/components/public/hall/RoomView";
import siteConfig from "@/lib/site.config";

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
    title: `${gallery.title} · The Hall`,
    description: gallery.description ?? undefined,
    openGraph: {
      title: `${gallery.title} · ${siteConfig.siteName}`,
      description: gallery.description ?? undefined,
      images: gallery.coverImageUrl ? [gallery.coverImageUrl] : undefined,
    },
  };
}

export default async function HallRoomPage({ params }: Props) {
  const { slug } = await params;

  const [gallery] = await db
    .select()
    .from(galleries)
    .where(and(eq(galleries.slug, slug), eq(galleries.isPublished, true)));

  if (!gallery) notFound();

  const published = await db
    .select({ id: galleries.id, slug: galleries.slug })
    .from(galleries)
    .where(eq(galleries.isPublished, true))
    .orderBy(asc(galleries.position));
  const roomIndex = published.findIndex((g) => g.id === gallery.id);

  const rows = await db
    .select()
    .from(photos)
    .where(eq(photos.galleryId, gallery.id))
    .orderBy(asc(photos.position));

  const roomPhotos: RoomPhoto[] = rows.map((p) => ({
    id: p.id,
    url: p.url,
    thumbnailUrl: p.thumbnailUrl ?? p.url,
    title: p.title,
    description: p.description,
    location: p.location,
    latitude: p.latitude,
    longitude: p.longitude,
    cameraSettings: p.cameraSettings as RoomPhoto["cameraSettings"],
    width: p.width,
    height: p.height,
    createdAt: p.createdAt.toISOString(),
  }));

  return (
    <div className="hall-ex relative w-full">
      <RoomView
        galleryTitle={gallery.title}
        gallerySlug={gallery.slug}
        tagline={gallery.tagline ?? gallery.description ?? ""}
        accentColor={gallery.accentColor ?? null}
        roomIndex={roomIndex}
        photos={roomPhotos}
      />
    </div>
  );
}
