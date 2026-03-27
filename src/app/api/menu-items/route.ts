import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { menuItems } from "@/lib/db/schema";
import { eq, asc } from "drizzle-orm";

export async function GET() {
  const items = await db
    .select()
    .from(menuItems)
    .orderBy(asc(menuItems.position));
  return NextResponse.json(items);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const [item] = await db.insert(menuItems).values(body).returning();
  return NextResponse.json(item);
}

export async function PUT(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();

  // Bulk reorder: expects { items: [{ id, position }] }
  if (body.items && Array.isArray(body.items)) {
    for (const item of body.items) {
      await db
        .update(menuItems)
        .set({ position: item.position })
        .where(eq(menuItems.id, item.id));
    }
    const updated = await db
      .select()
      .from(menuItems)
      .orderBy(asc(menuItems.position));
    return NextResponse.json(updated);
  }

  // Single item update
  if (!body.id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  const { id, ...data } = body;
  const [updated] = await db
    .update(menuItems)
    .set(data)
    .where(eq(menuItems.id, id))
    .returning();
  return NextResponse.json(updated);
}

export async function DELETE(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  await db.delete(menuItems).where(eq(menuItems.id, id));
  return NextResponse.json({ success: true });
}
