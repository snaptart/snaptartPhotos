import { NextResponse } from "next/server";
import { eq, inArray } from "drizzle-orm";
import { getAdminSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { pages } from "@/lib/db/schema";
import { readBlockDefaults } from "@/lib/block-defaults-store";
import { snapshotPages } from "@/lib/page-revisions";
import { applyToPage, DEFAULTS_TYPES, isDefaultable, type ApplyRequest } from "@/lib/puck/block-defaults";
import { isPuckData } from "@/lib/puck/data-tree";

/**
 * POST { type, label, values, builtIn, mode, pageIds?, dryRun } — sets the given settings on
 * blocks already on pages. With dryRun it only counts. Otherwise every page it changes is saved
 * as a revision first, all in one batch, so the whole run can be undone.
 */
export async function POST(req: Request) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = (await req.json()) as Omit<ApplyRequest, "past"> & {
      label?: string;
      pageIds?: string[];
      dryRun?: boolean;
    };
    if (!DEFAULTS_TYPES.includes(body.type)) return NextResponse.json({ error: "Unknown block" }, { status: 400 });
    const values = Object.fromEntries(
      Object.entries(body.values ?? {}).filter(([k, v]) => isDefaultable(body.type, k) && v !== undefined),
    );
    if (!Object.keys(values).length) return NextResponse.json({ error: "Choose at least one setting" }, { status: 400 });

    const { past } = await readBlockDefaults();
    const request: ApplyRequest = {
      type: body.type,
      values,
      mode: body.mode === "all" ? "all" : "untouched",
      builtIn: body.builtIn ?? {},
      past: past[body.type] ?? {},
    };

    // pageIds limits the run to chosen pages; left out, it covers every page and story.
    if (Array.isArray(body.pageIds) && !body.pageIds.length) return NextResponse.json({ pages: [], totalBlocks: 0 });
    const rows = await db
      .select({ id: pages.id, title: pages.title, slug: pages.slug, pageType: pages.pageType, content: pages.content })
      .from(pages)
      .where(Array.isArray(body.pageIds) ? inArray(pages.id, body.pageIds) : undefined);

    const changes = rows
      .filter((r) => isPuckData(r.content))
      .map((r) => ({ row: r, result: applyToPage(r.content as never, request) }))
      .filter((c) => c.result.blocks > 0);

    const summary = changes.map(({ row, result }) => ({
      id: row.id,
      title: row.title,
      slug: row.slug,
      pageType: row.pageType,
      blocks: result.blocks,
    }));
    const totalBlocks = summary.reduce((n, p) => n + p.blocks, 0);
    if (body.dryRun || !changes.length) return NextResponse.json({ pages: summary, totalBlocks });

    const batchId = await snapshotPages(
      changes.map((c) => c.row.id),
      `Applied ${body.label ?? body.type} defaults`,
    );
    for (const { row, result } of changes) {
      await db.update(pages).set({ content: result.data, updatedAt: new Date() }).where(eq(pages.id, row.id));
    }
    return NextResponse.json({ pages: summary, totalBlocks, batchId });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
