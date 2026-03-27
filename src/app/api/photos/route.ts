import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { photos } from "@/lib/db/schema";
import { eq, asc } from "drizzle-orm";
import { del } from "@vercel/blob";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const galleryId = searchParams.get("galleryId");

  if (galleryId) {
    const items = await db
      .select()
      .from(photos)
      .where(eq(photos.galleryId, galleryId))
      .orderBy(asc(photos.position));
    return NextResponse.json(items);
  }

  const items = await db
    .select()
    .from(photos)
    .orderBy(asc(photos.position));
  return NextResponse.json(items);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const [item] = await db.insert(photos).values(body).returning();
  return NextResponse.json(item);
}

export async function PUT(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();

  // Bulk reorder
  if (body.items && Array.isArray(body.items)) {
    for (const item of body.items) {
      await db
        .update(photos)
        .set({ position: item.position })
        .where(eq(photos.id, item.id));
    }
    const galleryId = body.galleryId;
    const updated = galleryId
      ? await db
          .select()
          .from(photos)
          .where(eq(photos.galleryId, galleryId))
          .orderBy(asc(photos.position))
      : await db.select().from(photos).orderBy(asc(photos.position));
    return NextResponse.json(updated);
  }

  // Single update
  if (!body.id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  const { id, ...data } = body;
  data.updatedAt = new Date();

  const [updated] = await db
    .update(photos)
    .set(data)
    .where(eq(photos.id, id))
    .returning();
  return NextResponse.json(updated);
}

export async function DELETE(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  // Delete from Vercel Blob first
  const [photo] = await db
    .select()
    .from(photos)
    .where(eq(photos.id, id));
  if (photo) {
    await del(photo.blobUrl);
  }

  await db.delete(photos).where(eq(photos.id, id));
  return NextResponse.json({ success: true });
}
