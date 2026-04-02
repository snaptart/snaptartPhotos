import { db } from "@/lib/db";
import { pages } from "@/lib/db/schema";
import { eq, and, asc } from "drizzle-orm";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Stories",
};

export default async function StoriesIndexPage() {
  const stories = await db
    .select({
      title: pages.title,
      slug: pages.slug,
      metaDescription: pages.metaDescription,
      isPasswordProtected: pages.isPasswordProtected,
    })
    .from(pages)
    .where(and(eq(pages.pageType, "story"), eq(pages.isPublished, true)))
    .orderBy(asc(pages.position));

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1
        className="mb-10 text-center text-4xl font-semibold tracking-tight"
        style={{ fontFamily: "var(--theme-font-headings)" }}
      >
        Stories
      </h1>
      {stories.length === 0 ? (
        <p className="text-center text-neutral-500">No stories yet.</p>
      ) : (
        <div className="space-y-6">
          {stories.map((story) => (
            <Link
              key={story.slug}
              href={`/stories/${story.slug}`}
              className="block rounded-lg border border-neutral-200 px-6 py-5 transition-colors hover:border-neutral-400 hover:bg-neutral-50"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2
                    className="text-xl font-semibold"
                    style={{ fontFamily: "var(--theme-font-headings)" }}
                  >
                    {story.title}
                  </h2>
                  {story.metaDescription && (
                    <p className="mt-1 text-sm text-neutral-500">{story.metaDescription}</p>
                  )}
                </div>
                {story.isPasswordProtected && (
                  <span className="shrink-0 rounded bg-neutral-100 px-2 py-0.5 text-xs text-neutral-500">
                    Protected
                  </span>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
