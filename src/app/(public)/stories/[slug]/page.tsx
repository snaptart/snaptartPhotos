import { db } from "@/lib/db";
import { pages, galleries, photos, siteSettings } from "@/lib/db/schema";
import { eq, and, asc } from "drizzle-orm";
import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import type { Metadata } from "next";
import PuckRenderer from "@/components/public/PuckRenderer";
import type { Data } from "@puckeditor/core";
import type { EmbedPhoto, GlobalLightboxSettings } from "@/lib/puck/config";
import StoryPasswordForm from "./StoryPasswordForm";
import StoryReadingView from "@/components/public/stories/StoryReadingView";

type StoryMeta = {
  dek?: string;
  kind?: string;
  year?: string | number;
  readTime?: string;
  wordCount?: number;
  frontispieceUrl?: string;
};

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

  // Pull ordered story list so we can show № and the Next card
  const allStories = await db
    .select({ slug: pages.slug, title: pages.title, metaDescription: pages.metaDescription, storyMeta: pages.storyMeta })
    .from(pages)
    .where(and(eq(pages.pageType, "story"), eq(pages.isPublished, true)))
    .orderBy(asc(pages.position));
  const storyIndex = allStories.findIndex((s) => s.slug === slug);
  const nextEntry = storyIndex >= 0 && storyIndex < allStories.length - 1 ? allStories[storyIndex + 1] : null;
  const nextStory = nextEntry
    ? {
        title: nextEntry.title,
        slug: nextEntry.slug,
        dek: (nextEntry.storyMeta as StoryMeta | null)?.dek ?? nextEntry.metaDescription ?? "",
      }
    : null;

  const meta = (story.storyMeta ?? {}) as StoryMeta;
  const yearStr =
    meta.year != null ? String(meta.year) : new Date(story.createdAt).getFullYear().toString();
  const readTime = meta.readTime ??
    (meta.wordCount ? `${Math.max(1, Math.round(meta.wordCount / 220))} min read` : "");

  if (!isPuckData(story.content)) {
    return (
      <StoryReadingView
        number={storyIndex + 1}
        title={story.title}
        dek={meta.dek ?? story.metaDescription ?? ""}
        kind={meta.kind ?? "Short"}
        year={yearStr}
        wordCount={meta.wordCount ?? null}
        readTime={readTime}
        frontispiece={meta.frontispieceUrl ?? story.ogImageUrl ?? null}
        nextStory={nextStory}
      >
        <p style={{ textAlign: "center", fontStyle: "italic", color: "var(--st-ink-soft)" }}>
          This story has no content yet.
        </p>
      </StoryReadingView>
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
    <StoryReadingView
      number={storyIndex + 1}
      title={story.title}
      dek={meta.dek ?? story.metaDescription ?? ""}
      kind={meta.kind ?? "Short"}
      year={yearStr}
      wordCount={meta.wordCount ?? null}
      readTime={readTime}
      frontispiece={meta.frontispieceUrl ?? story.ogImageUrl ?? null}
      nextStory={nextStory}
    >
      <PuckRenderer data={story.content} galleryPhotos={galleryPhotos} globalLightbox={globalLightbox} />
    </StoryReadingView>
  );
}
