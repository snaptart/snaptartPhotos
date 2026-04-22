import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { pages } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { STORIES_INDEX_SLUG, STORIES_INDEX_TYPE } from "@/lib/stories/constants";

export async function GET() {
  try {
    const [row] = await db.select().from(pages).where(eq(pages.slug, STORIES_INDEX_SLUG));
    return NextResponse.json(row ?? null);
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const content = body.content ?? null;

    const [existing] = await db.select().from(pages).where(eq(pages.slug, STORIES_INDEX_SLUG));

    if (existing) {
      const [updated] = await db
        .update(pages)
        .set({ content, updatedAt: new Date() })
        .where(eq(pages.id, existing.id))
        .returning();
      return NextResponse.json(updated);
    }

    const [created] = await db
      .insert(pages)
      .values({
        title: "Stories — Contents",
        slug: STORIES_INDEX_SLUG,
        pageType: STORIES_INDEX_TYPE,
        isPublished: true,
        content,
      })
      .returning();
    return NextResponse.json(created);
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
