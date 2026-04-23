import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { photos, galleries } from "@/lib/db/schema";
import { eq, asc, inArray } from "drizzle-orm";
import { del } from "@vercel/blob";

export async function GET(req: Request) {
  try {
    const session = await auth();
    const { searchParams } = new URL(req.url);
    const galleryId = searchParams.get("galleryId");
    const gallerySlug = searchParams.get("gallerySlug");

    if (galleryId) {
      if (!session) {
        const [gallery] = await db
          .select({ isPublished: galleries.isPublished })
          .from(galleries)
          .where(eq(galleries.id, galleryId));
        if (!gallery?.isPublished) return NextResponse.json([]);
      }
      const items = await db
        .select()
        .from(photos)
        .where(eq(photos.galleryId, galleryId))
        .orderBy(asc(photos.position));
      return NextResponse.json(items);
    }

    if (gallerySlug) {
      const [gallery] = await db
        .select({ id: galleries.id, isPublished: galleries.isPublished })
        .from(galleries)
        .where(eq(galleries.slug, gallerySlug));
      if (!gallery || (!session && !gallery.isPublished)) return NextResponse.json([]);
      const items = await db
        .select()
        .from(photos)
        .where(eq(photos.galleryId, gallery.id))
        .orderBy(asc(photos.position));
      return NextResponse.json(items);
    }

    const items = await db.select().from(photos).orderBy(asc(photos.position));
    return NextResponse.json(items);
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    if (Object.prototype.hasOwnProperty.call(body, "takenAt")) {
      body.takenAt = body.takenAt ? new Date(body.takenAt) : null;
    }
    const [item] = await db.insert(photos).values(body).returning();
    return NextResponse.json(item);
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();

    // Bulk reorder
    if (body.items && Array.isArray(body.items)) {
      for (const item of body.items) {
        await db.update(photos).set({ position: item.position }).where(eq(photos.id, item.id));
      }
      const galleryId = body.galleryId;
      const updated = galleryId
        ? await db.select().from(photos).where(eq(photos.galleryId, galleryId)).orderBy(asc(photos.position))
        : await db.select().from(photos).orderBy(asc(photos.position));
      return NextResponse.json(updated);
    }

    // Bulk metadata update — body: { bulk: { ids: string[], patch: { ... } } }
    if (body.bulk && Array.isArray(body.bulk.ids) && body.bulk.ids.length > 0) {
      const allowed = [
        "galleryId",
        "title",
        "description",
        "location",
        "tags",
      ] as const;
      const patch: Record<string, unknown> = {};
      for (const key of allowed) {
        if (Object.prototype.hasOwnProperty.call(body.bulk.patch ?? {}, key)) {
          patch[key] = body.bulk.patch[key];
        }
      }
      if (Object.keys(patch).length === 0) {
        return NextResponse.json({ error: "No fields to update" }, { status: 400 });
      }
      patch.updatedAt = new Date();
      await db.update(photos).set(patch).where(inArray(photos.id, body.bulk.ids));
      return NextResponse.json({ success: true, updated: body.bulk.ids.length });
    }

    // Single update
    if (!body.id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
    const { id, ...data } = body;
    if (Object.prototype.hasOwnProperty.call(data, "takenAt")) {
      data.takenAt = data.takenAt ? new Date(data.takenAt) : null;
    }
    data.updatedAt = new Date();

    const [updated] = await db.update(photos).set(data).where(eq(photos.id, id)).returning();
    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const idsParam = searchParams.get("ids");

    // Bulk delete: ?ids=a,b,c
    if (idsParam) {
      const ids = idsParam.split(",").filter(Boolean);
      if (ids.length === 0) {
        return NextResponse.json({ error: "Missing ids" }, { status: 400 });
      }
      const rows = await db.select().from(photos).where(inArray(photos.id, ids));
      await Promise.allSettled(rows.map((r) => del(r.blobUrl)));
      await db.delete(photos).where(inArray(photos.id, ids));
      return NextResponse.json({ success: true, deleted: ids.length });
    }

    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    const [photo] = await db.select().from(photos).where(eq(photos.id, id));
    if (photo) await del(photo.blobUrl);

    await db.delete(photos).where(eq(photos.id, id));
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
