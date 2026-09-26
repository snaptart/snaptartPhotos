import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import type { Data } from "@puckeditor/core";
import { getAdminSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { pages } from "@/lib/db/schema";
import { appendFragment, isPuckData, withFreshIds, type BlockFragment } from "@/lib/puck/data-tree";
import { snapshotPages } from "@/lib/page-revisions";

const EMPTY_DATA: Data = { root: { props: {} }, content: [], zones: {} };

/**
 * POST { targetId, fragment, label? } — adds copies of blocks (with everything inside them)
 * to the end of another page or story. The target's previous content is kept as a revision.
 */
export async function POST(req: Request) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { targetId, fragment, label } = (await req.json()) as {
      targetId?: string;
      fragment?: BlockFragment;
      label?: string;
    };
    if (!targetId || !fragment || !Array.isArray(fragment.content) || !fragment.content.length) {
      return NextResponse.json({ error: "Missing target or blocks" }, { status: 400 });
    }

    const [target] = await db.select().from(pages).where(eq(pages.id, targetId));
    if (!target) return NextResponse.json({ error: "That page no longer exists." }, { status: 404 });

    const current = target.content == null ? EMPTY_DATA : target.content;
    if (!isPuckData(current)) {
      return NextResponse.json(
        { error: `"${target.title}" still uses the old text editor, so blocks can't be added to it.` },
        { status: 400 },
      );
    }

    const copy = withFreshIds({ content: fragment.content, zones: fragment.zones ?? {} }, (type) => `${type}-${crypto.randomUUID()}`);
    await snapshotPages([target.id], `Copied ${label ? `a ${label} block` : "blocks"} in`);
    const [updated] = await db
      .update(pages)
      .set({ content: appendFragment(current, copy), updatedAt: new Date() })
      .where(eq(pages.id, target.id))
      .returning({ id: pages.id, title: pages.title, slug: pages.slug, pageType: pages.pageType, isPublished: pages.isPublished });
    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
