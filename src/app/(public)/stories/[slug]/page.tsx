import { db } from "@/lib/db";
import { pages, galleries, photos, siteSettings } from "@/lib/db/schema";
import { eq, and, asc } from "drizzle-orm";
import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import type { Metadata } from "next";
import PuckRenderer from "@/components/public/PuckRenderer";
import type { Data } from "@puckeditor/core";
import type { EmbedPhoto, GlobalLightboxSettings } from "@/lib/puck/config";
import { buildGoogleFontsUrl, getFontFallback } from "@/lib/theme/fonts";
import StoryPasswordForm from "./StoryPasswordForm";

interface Props {
  params: Promise<{ slug: string }>;
}

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
  const [story] = await db
    .select()
    .from(pages)
    .where(
      and(
        eq(pages.slug, slug),
        eq(pages.pageType, "story"),
        eq(pages.isPublished, true)
      )
    );

  if (!story) return {};

  return {
    title: story.metaTitle ?? story.title,
    description: story.metaDescription ?? undefined,
    openGraph: {
      title: story.metaTitle ?? story.title,
      description: story.metaDescription ?? undefined,
      images: story.ogImageUrl ? [story.ogImageUrl] : undefined,
    },
  };
}

const FONT_SIZE_CLASSES = {
  small: "text-base",
  medium: "text-lg",
  large: "text-xl",
} as const;

export default async function StoryPage({ params }: Props) {
  const { slug } = await params;

  const [story] = await db
    .select()
    .from(pages)
    .where(
      and(
        eq(pages.slug, slug),
        eq(pages.pageType, "story"),
        eq(pages.isPublished, true)
      )
    );

  if (!story) notFound();

  // Check password protection
  if (story.isPasswordProtected) {
    const cookieStore = await cookies();
    const accessCookie = cookieStore.get(`story-access-${slug}`);
    if (accessCookie?.value !== "granted") {
      return <StoryPasswordForm slug={slug} title={story.title} />;
    }
  }

  // Build typography styles
  const typography = story.typography as {
    fontHeadings?: string;
    fontBody?: string;
    bodyFontSize?: "small" | "medium" | "large";
  } | null;

  const fontsToLoad: string[] = [];
  if (typography?.fontHeadings) fontsToLoad.push(typography.fontHeadings);
  if (typography?.fontBody) fontsToLoad.push(typography.fontBody);
  const googleFontsUrl = buildGoogleFontsUrl(fontsToLoad);

  const headingStyle = typography?.fontHeadings
    ? { fontFamily: getFontFallback(typography.fontHeadings) }
    : { fontFamily: "var(--theme-font-headings)" };

  const bodyStyle = typography?.fontBody
    ? { fontFamily: getFontFallback(typography.fontBody) }
    : {};

  const fontSizeClass = FONT_SIZE_CLASSES[typography?.bodyFontSize ?? "medium"];

  if (!isPuckData(story.content)) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12">
        {googleFontsUrl && (
          <link rel="stylesheet" href={googleFontsUrl} />
        )}
        {story.showTitle && (
          <h1
            className="mb-8 text-center text-4xl font-semibold tracking-tight"
            style={headingStyle}
          >
            {story.title}
          </h1>
        )}
        <p className="text-center text-neutral-500">This story has no content yet.</p>
      </div>
    );
  }

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
  const embedItems = (story.content.content ?? []).filter(
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
    <div className={`mx-auto max-w-3xl px-4 py-12 ${fontSizeClass}`} style={bodyStyle}>
      {googleFontsUrl && (
        <link rel="stylesheet" href={googleFontsUrl} />
      )}
      {story.showTitle && (
        <h1
          className="mb-8 text-center text-4xl font-semibold tracking-tight"
          style={headingStyle}
        >
          {story.title}
        </h1>
      )}
      <PuckRenderer data={story.content} galleryPhotos={galleryPhotos} globalLightbox={globalLightbox} />
    </div>
  );
}
