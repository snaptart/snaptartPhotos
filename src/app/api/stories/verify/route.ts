import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { pages } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
  try {
    const { slug, password } = await req.json();

    if (!slug || !password) {
      return NextResponse.json({ error: "Missing slug or password" }, { status: 400 });
    }

    const [story] = await db
      .select()
      .from(pages)
      .where(
        and(
          eq(pages.slug, slug),
          eq(pages.pageType, "story"),
          eq(pages.isPublished, true),
          eq(pages.isPasswordProtected, true)
        )
      );

    if (!story || !story.passwordHash) {
      return NextResponse.json({ error: "Story not found" }, { status: 404 });
    }

    const valid = await bcrypt.compare(password, story.passwordHash);
    if (!valid) {
      return NextResponse.json({ error: "Incorrect password" }, { status: 401 });
    }

    const response = NextResponse.json({ success: true });
    response.cookies.set(`story-access-${slug}`, "granted", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24, // 24 hours
      path: "/",
    });

    return response;
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
