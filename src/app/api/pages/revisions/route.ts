import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { getAdminSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { pageRevisions } from "@/lib/db/schema";
import { restoreBatch, restoreRevision } from "@/lib/page-revisions";

/** GET ?pageId= — a page's saved revisions, newest first (without their content). */
export async function GET(req: Request) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const pageId = new URL(req.url).searchParams.get("pageId");
  if (!pageId) return NextResponse.json({ error: "Missing pageId" }, { status: 400 });
  try {
    const rows = await db
      .select({
        id: pageRevisions.id,
        reason: pageRevisions.reason,
        batchId: pageRevisions.batchId,
        createdAt: pageRevisions.createdAt,
      })
      .from(pageRevisions)
      .where(eq(pageRevisions.pageId, pageId))
      .orderBy(desc(pageRevisions.createdAt));
    return NextResponse.json(rows);
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * POST { revisionId } — puts one page back as it was before that change.
 * POST { batchId } — puts back every page one change touched ("apply block defaults" can touch many).
 * Either way the current content is saved first, so the restore can be undone too.
 */
export async function POST(req: Request) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { batchId, revisionId } = (await req.json()) as { batchId?: string; revisionId?: string };
    if (!batchId && !revisionId) return NextResponse.json({ error: "Missing batchId or revisionId" }, { status: 400 });
    const result = revisionId ? await restoreRevision(revisionId) : await restoreBatch(batchId!);
    if (!result.restored) return NextResponse.json({ error: "That revision no longer exists." }, { status: 404 });
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
