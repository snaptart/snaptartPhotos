import { db } from "@/lib/db";
import { pages } from "@/lib/db/schema";
import { eq, and, asc } from "drizzle-orm";
import type { Metadata } from "next";
import type { Data } from "@puckeditor/core";
import StoriesIndex, {
  STORIES_INDEX_DEFAULTS,
  type IndexStory,
} from "@/components/public/stories/StoriesIndex";
import PuckRenderer from "@/components/public/PuckRenderer";
import { STORIES_INDEX_SLUG } from "@/lib/stories/constants";

export const metadata: Metadata = {
  title: "Stories",
};

type StoryMeta = {
  dek?: string;
  kind?: string;
  year?: string | number;
  readTime?: string;
  wordCount?: number;
  frontispieceUrl?: string;
};

function isPuckData(content: unknown): content is Data {
  return (
    typeof content === "object" &&
    content !== null &&
    "root" in content &&
    "content" in content
  );
}

export default async function StoriesIndexPage() {
  const rows = await db
    .select({
      title: pages.title,
      slug: pages.slug,
      metaDescription: pages.metaDescription,
      storyMeta: pages.storyMeta,
      ogImageUrl: pages.ogImageUrl,
      isPasswordProtected: pages.isPasswordProtected,
      position: pages.position,
      createdAt: pages.createdAt,
    })
    .from(pages)
    .where(and(eq(pages.pageType, "story"), eq(pages.isPublished, true)))
    .orderBy(asc(pages.position));

  const stories: IndexStory[] = rows.map((r) => {
    const meta = (r.storyMeta ?? {}) as StoryMeta;
    return {
      title: r.title,
      slug: r.slug,
      dek: meta.dek ?? r.metaDescription ?? "",
      kind: meta.kind ?? "Short",
      year: meta.year != null ? String(meta.year) : new Date(r.createdAt).getFullYear().toString(),
      readTime: meta.readTime ?? (meta.wordCount ? `${Math.max(1, Math.round(meta.wordCount / 220))} MIN READ` : ""),
      wordCount: meta.wordCount ?? null,
      frontispiece: meta.frontispieceUrl ?? r.ogImageUrl ?? null,
      isProtected: r.isPasswordProtected,
    };
  });

  const [indexDoc] = await db
    .select({ content: pages.content })
    .from(pages)
    .where(eq(pages.slug, STORIES_INDEX_SLUG));

  if (indexDoc && isPuckData(indexDoc.content)) {
    return <PuckRenderer data={indexDoc.content} storiesIndex={stories} />;
  }

  return (
    <StoriesIndex
      stories={stories}
      volumeLabel={STORIES_INDEX_DEFAULTS.volumeLabel}
      title={STORIES_INDEX_DEFAULTS.title}
      dek={STORIES_INDEX_DEFAULTS.dek}
    />
  );
}
