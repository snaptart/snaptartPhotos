import { getAdminSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { adminUsers } from "@/lib/db/schema";
import { hashPassword } from "@/lib/password";
import { eq } from "drizzle-orm";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getAdminSession();
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const { password } = await req.json();

  if (!password || typeof password !== "string") {
    return Response.json({ error: "Password required" }, { status: 400 });
  }

  if (password.length < 8) {
    return Response.json({ error: "Password must be at least 8 characters" }, { status: 400 });
  }

  const passwordHash = await hashPassword(password);
  await db
    .update(adminUsers)
    .set({ passwordHash })
    .where(eq(adminUsers.id, id));

  return Response.json({ success: true });
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getAdminSession();
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  if (session.user?.id === id) {
    return Response.json({ error: "Cannot delete your own account" }, { status: 400 });
  }

  await db.delete(adminUsers).where(eq(adminUsers.id, id));

  return Response.json({ success: true });
}
