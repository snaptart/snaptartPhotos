import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { galleries } from "@/lib/db/schema";
import { eq, asc } from "drizzle-orm";

export async function GET() {
  const session = await auth();
  const items = session
    ? await db.select().from(galleries).orderBy(asc(galleries.position))
    : await db.select().from(galleries).where(eq(galleries.isPublished, true)).orderBy(asc(galleries.position));
  return NextResponse.json(items);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const slug = body.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  const [item] = await db
    .insert(galleries)
    .values({ ...body, slug })
    .returning();
  return NextResponse.json(item);
}

export async function PUT(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();

  // Bulk reorder
  if (body.items && Array.isArray(body.items)) {
    await db.transaction(async (tx) => {
      for (const item of body.items) {
        await tx
          .update(galleries)
          .set({ position: item.position })
          .where(eq(galleries.id, item.id));
      }
    });
    const updated = await db
      .select()
      .from(galleries)
      .orderBy(asc(galleries.position));
    return NextResponse.json(updated);
  }

  // Single update
  if (!body.id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  const { id, ...data } = body;

  // Regenerate slug if title changed
  if (data.title) {
    data.slug = data.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  }
  data.updatedAt = new Date();

  const [updated] = await db
    .update(galleries)
    .set(data)
    .where(eq(galleries.id, id))
    .returning();
  return NextResponse.json(updated);
}

export async function DELETE(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  await db.delete(galleries).where(eq(galleries.id, id));
  return NextResponse.json({ success: true });
}
