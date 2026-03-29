import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { galleries } from "@/lib/db/schema";
import { eq, asc } from "drizzle-orm";
import { generateSlug } from "@/lib/utils";

export async function GET() {
  try {
    const session = await auth();
    const items = session
      ? await db.select().from(galleries).orderBy(asc(galleries.position))
      : await db.select().from(galleries).where(eq(galleries.isPublished, true)).orderBy(asc(galleries.position));
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
    const slug = generateSlug(body.title);
    const [item] = await db.insert(galleries).values({ ...body, slug }).returning();
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
          await tx.update(galleries).set({ position: item.position }).where(eq(galleries.id, item.id));
        }
      });
      const updated = await db.select().from(galleries).orderBy(asc(galleries.position));
      return NextResponse.json(updated);
    }

    // Single update
    if (!body.id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
    const { id, ...data } = body;
    if (data.title) data.slug = generateSlug(data.title);
    data.updatedAt = new Date();

    const [updated] = await db.update(galleries).set(data).where(eq(galleries.id, id)).returning();
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

    await db.delete(galleries).where(eq(galleries.id, id));
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
