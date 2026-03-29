import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { siteSettings } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  try {
    const rows = await db.select().from(siteSettings).limit(1);
    return NextResponse.json(rows[0] ?? null);
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const rows = await db.select().from(siteSettings).limit(1);

    if (rows.length === 0) {
      const [created] = await db.insert(siteSettings).values(body).returning();
      return NextResponse.json(created);
    }

    const [updated] = await db
      .update(siteSettings)
      .set({ ...body, updatedAt: new Date() })
      .where(eq(siteSettings.id, rows[0].id))
      .returning();

    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
