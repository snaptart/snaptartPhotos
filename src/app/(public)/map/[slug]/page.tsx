import { db } from "@/lib/db";
import { galleries, photos, siteSettings } from "@/lib/db/schema";
import { and, asc, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { DEFAULT_ROOM_CAPTION_FIELDS, type RoomPhoto } from "@/components/public/hall/RoomView";
import siteConfig from "@/lib/site.config";
import { getFieldMapData } from "@/lib/fieldmap/query";
import RegionPageClient from "./RegionPageClient";
import type { MapStyle } from "@/components/public/fieldmap/types";

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
    title: `${gallery.title} · ${siteConfig.siteName}`,
    description: gallery.description ?? undefined,
    openGraph: {
      title: `${gallery.title} · ${siteConfig.siteName}`,
      description: gallery.description ?? undefined,
      images: gallery.coverImageUrl ? [gallery.coverImageUrl] : undefined,
    },
  };
}

export default async function FieldMapRegionPage({ params }: Props) {
  const { slug } = await params;

  const [gallery] = await db
    .select()
    .from(galleries)
    .where(and(eq(galleries.slug, slug), eq(galleries.isPublished, true)));

  if (!gallery) notFound();

  const [settingsRow] = await db.select().from(siteSettings).limit(1);
  const fieldMapData = await getFieldMapData();

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
    takenAt: p.takenAt ? p.takenAt.toISOString() : null,
    createdAt: p.createdAt.toISOString(),
  }));

  const rawStyle = settingsRow?.fieldMapStyle;
  const mapStyle: MapStyle =
    rawStyle === "mono" || rawStyle === "blueprint" ? rawStyle : "modern";

  return (
    <>
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Inter:wght@300;400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap"
      />
      <RegionPageClient
        fieldMapData={fieldMapData}
        mapStyle={mapStyle}
        siteTitle={settingsRow?.siteTitle ?? siteConfig.siteName}
        slug={gallery.slug}
        galleryTitle={gallery.title}
        tagline={gallery.tagline ?? gallery.description ?? ""}
        accentColor={gallery.accentColor ?? null}
        latitude={gallery.latitude}
        longitude={gallery.longitude}
        photos={roomPhotos}
        captionFields={gallery.roomCaptionFields ?? DEFAULT_ROOM_CAPTION_FIELDS}
      />
    </>
  );
}
