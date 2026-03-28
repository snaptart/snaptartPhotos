import { db } from "@/lib/db";
import { pages } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { generateHTML } from "@tiptap/html";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import TextAlign from "@tiptap/extension-text-align";
import Underline from "@tiptap/extension-underline";
import PuckRenderer from "@/components/public/PuckRenderer";
import type { Data } from "@puckeditor/core";

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
      images: page.ogImageUrl ? [page.ogImageUrl] : undefined,
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
    return (
      <div className="mx-auto max-w-5xl px-4 py-12">
        <h1 className="mb-8 text-center font-serif text-4xl font-semibold tracking-tight">
          {page.title}
        </h1>
        <PuckRenderer data={page.content} />
      </div>
    );
  }

  // Legacy Tiptap content (for pages created before Puck migration)
  const html = page.content
    ? generateHTML(page.content as Parameters<typeof generateHTML>[0], tiptapExtensions)
    : "";

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="mb-8 text-center text-4xl font-semibold tracking-tight">
        {page.title}
      </h1>
      {html ? (
        <div
          className="prose prose-lg mx-auto"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      ) : (
        <p className="text-center text-neutral-500">This page has no content yet.</p>
      )}
    </div>
  );
}
