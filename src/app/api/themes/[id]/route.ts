import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { themes } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { id } = await params;
    const body = await req.json();
    const [updated] = await db
      .update(themes)
      .set({
        ...(body.name !== undefined && { name: body.name }),
        ...(body.themeSettings !== undefined && {
          themeSettings: body.themeSettings,
        }),
        updatedAt: new Date(),
      })
      .where(eq(themes.id, id))
      .returning();

    if (!updated)
      return NextResponse.json({ error: "Theme not found" }, { status: 404 });

    return NextResponse.json(updated);
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { id } = await params;
    const [deleted] = await db
      .delete(themes)
      .where(eq(themes.id, id))
      .returning();

    if (!deleted)
      return NextResponse.json({ error: "Theme not found" }, { status: 404 });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
