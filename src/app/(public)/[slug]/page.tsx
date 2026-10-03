import { db } from "@/lib/db";
import { shareImagesOr } from "@/lib/site-icon";
import { pages, siteSettings } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { loadGalleryPhotos } from "@/lib/puck/gallery-photos";
import { pageSeed } from "@/lib/puck/page-seed";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { generateHTML } from "@tiptap/html";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import TextAlign from "@tiptap/extension-text-align";
import Underline from "@tiptap/extension-underline";
import PuckRenderer from "@/components/public/PuckRenderer";
import { HeaderOverPhotoMark, opensWithPhoto } from "@/lib/header-over-photo";
import { loadPickedPhotos } from "@/lib/puck/picked-photos";
import type { Data } from "@puckeditor/core";
import type { FieldMapBlockData, GlobalLightboxSettings } from "@/lib/puck/config";
import siteConfig from "@/lib/site.config";
import { fontRole } from "@/lib/theme/role-style";
import { PAGE_SPACE, PROSE_CONTAINER } from "@/lib/theme/layout";
import { PageFrame } from "@/components/public/PageFrame";
import { pageLayoutOf } from "@/lib/page-layout";
import { getFieldMapData } from "@/lib/fieldmap/query";

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
      images: await shareImagesOr(page.ogImageUrl),
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

    const galleryPhotos = await loadGalleryPhotos(page.content);
    const photosById = await loadPickedPhotos(page.content);

    const hasFieldMap =
      siteConfig.features.fieldMap &&
      (page.content.content ?? []).some((item: { type: string }) => item.type === "FieldMap");
    const fieldMap: FieldMapBlockData | null = hasFieldMap
      ? {
          ...(await getFieldMapData()),
          siteTitle: settingsRow?.siteTitle ?? siteConfig.siteName,
        }
      : null;

    const underHeader = opensWithPhoto(page.content, page);

    return (
      <PageFrame
        layout={pageLayoutOf(page.content)}
        isFullBleed={page.isFullBleed}
        flushTop={underHeader}
        title={page.showTitle ? page.title : null}
      >
        {underHeader && <HeaderOverPhotoMark />}
        <PuckRenderer
          data={page.content}
          galleryPhotos={galleryPhotos}
          globalLightbox={globalLightbox}
          fieldMap={fieldMap}
          photosById={photosById}
          seed={pageSeed()}
        />
      </PageFrame>
    );
  }

  // Legacy Tiptap content (for pages created before Puck migration)
  const html = page.content
    ? generateHTML(page.content as Parameters<typeof generateHTML>[0], tiptapExtensions)
    : "";

  return (
    <div className={`${PROSE_CONTAINER} ${PAGE_SPACE}`}>
      {page.showTitle && (
        <h1 className="mb-10 text-4xl md:text-5xl" style={fontRole("headings")}>
          {page.title}
        </h1>
      )}
      {html ? (
        <div
          className="prose prose-lg mx-auto"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      ) : (
        <p style={{ color: "var(--theme-color-gallery-captions)" }}>This page has no content yet.</p>
      )}
    </div>
  );
}
