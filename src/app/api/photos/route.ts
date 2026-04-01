import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { photos, galleries } from "@/lib/db/schema";
import { eq, asc } from "drizzle-orm";
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
      await db.transaction(async (tx) => {
        for (const item of body.items) {
          await tx.update(photos).set({ position: item.position }).where(eq(photos.id, item.id));
        }
      });
      const galleryId = body.galleryId;
      const updated = galleryId
        ? await db.select().from(photos).where(eq(photos.galleryId, galleryId)).orderBy(asc(photos.position))
        : await db.select().from(photos).orderBy(asc(photos.position));
      return NextResponse.json(updated);
    }

    // Single update
    if (!body.id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
    const { id, ...data } = body;
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
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    const [photo] = await db.select().from(photos).where(eq(photos.id, id));
    if (photo) await del(photo.blobUrl);

    await db.delete(photos).where(eq(photos.id, id));
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
