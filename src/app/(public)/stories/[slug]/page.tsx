import { db } from "@/lib/db";
import { shareImagesOr } from "@/lib/site-icon";
import { pages, siteSettings } from "@/lib/db/schema";
import { loadGalleryPhotos } from "@/lib/puck/gallery-photos";
import { pageSeed } from "@/lib/puck/page-seed";
import { eq, and, asc } from "drizzle-orm";
import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import type { Metadata } from "next";
import PuckRenderer from "@/components/public/PuckRenderer";
import { loadPickedPhotos } from "@/lib/puck/picked-photos";
import type { Data } from "@puckeditor/core";
import type { GlobalLightboxSettings } from "@/lib/puck/config";
import StoryPasswordForm from "./StoryPasswordForm";
import StoryReadingView from "@/components/public/stories/StoryReadingView";

type StoryMeta = {
  dek?: string;
  kind?: string;
  year?: string | number;
  readTime?: string;
  wordCount?: number;
  frontispieceUrl?: string;
  accentColor?: string;
  paperColor?: string;
  inkColor?: string;
  frontispieceAspect?: string;
  dropCap?: boolean;
  showEndMark?: boolean;
  endMark?: string;
  showProgressBar?: boolean;
  showNextStory?: boolean;
  bodyMaxWidth?: number;
  paginate?: boolean;
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
      images: await shareImagesOr(story.ogImageUrl),
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

  const chrome = {
    accentColor: meta.accentColor,
    paperColor: meta.paperColor,
    inkColor: meta.inkColor,
    frontispieceAspect: meta.frontispieceAspect,
    dropCap: meta.dropCap,
    showEndMark: meta.showEndMark,
    endMark: meta.endMark,
    showProgressBar: meta.showProgressBar,
    showNextStory: meta.showNextStory,
    bodyMaxWidth: meta.bodyMaxWidth,
    paginate: meta.paginate,
  };

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
        chrome={chrome}
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

  const galleryPhotos = await loadGalleryPhotos(story.content);
  const photosById = await loadPickedPhotos(story.content);

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
      chrome={chrome}
    >
      <PuckRenderer data={story.content} galleryPhotos={galleryPhotos} globalLightbox={globalLightbox} photosById={photosById} seed={pageSeed()} />
    </StoryReadingView>
  );
}
