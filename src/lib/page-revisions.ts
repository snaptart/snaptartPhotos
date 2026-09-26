import "server-only";
import { desc, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { pageRevisions, pages } from "@/lib/db/schema";

/** How many revisions each page keeps; older ones are dropped as new ones arrive. */
const KEEP_PER_PAGE = 20;

/**
 * Saves the pages' current content before a change made outside their editor.
 * Returns the batch id, which undoes the whole change at once.
 */
export async function snapshotPages(pageIds: string[], reason: string, batchId: string = crypto.randomUUID()): Promise<string> {
  if (!pageIds.length) return batchId;
  const rows = await db.select({ id: pages.id, content: pages.content }).from(pages).where(inArray(pages.id, pageIds));
  if (rows.length) {
    await db.insert(pageRevisions).values(rows.map((r) => ({ pageId: r.id, content: r.content, reason, batchId })));
  }
  await Promise.all(pageIds.map(prune));
  return batchId;
}

async function prune(pageId: string) {
  const old = await db
    .select({ id: pageRevisions.id })
    .from(pageRevisions)
    .where(eq(pageRevisions.pageId, pageId))
    .orderBy(desc(pageRevisions.createdAt))
    .offset(KEEP_PER_PAGE);
  if (old.length) await db.delete(pageRevisions).where(inArray(pageRevisions.id, old.map((r) => r.id)));
}

/**
 * Puts every page in the batch back as it was before that change. The pages' current
 * content is saved first (as its own batch), so an undo can itself be undone.
 */
export async function restoreBatch(batchId: string): Promise<{ restored: number; undoBatchId: string }> {
  return restore(await db.select().from(pageRevisions).where(eq(pageRevisions.batchId, batchId)));
}

/** Puts one page back as it was in this revision (other pages in its batch are left alone). */
export async function restoreRevision(revisionId: string): Promise<{ restored: number; undoBatchId: string }> {
  return restore(await db.select().from(pageRevisions).where(eq(pageRevisions.id, revisionId)));
}

async function restore(revs: (typeof pageRevisions.$inferSelect)[]): Promise<{ restored: number; undoBatchId: string }> {
  if (!revs.length) return { restored: 0, undoBatchId: "" };
  const reason = "Restored an earlier version";
  const undoBatchId = await snapshotPages(revs.map((r) => r.pageId), reason);
  for (const r of revs) {
    await db.update(pages).set({ content: r.content, updatedAt: new Date() }).where(eq(pages.id, r.pageId));
  }
  return { restored: revs.length, undoBatchId };
}
