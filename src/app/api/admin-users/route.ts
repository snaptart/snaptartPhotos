import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { adminUsers } from "@/lib/db/schema";
import { hashPassword } from "@/lib/password";

export async function GET() {
  const session = await auth();
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const users = await db
    .select({
      id: adminUsers.id,
      email: adminUsers.email,
      createdAt: adminUsers.createdAt,
    })
    .from(adminUsers)
    .orderBy(adminUsers.createdAt);

  // `isCurrent` lets the page mark the signed-in account and keep its Delete out of reach.
  return Response.json(users.map((u) => ({ ...u, isCurrent: u.id === session.user?.id })));
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const email = typeof body.email === "string" ? body.email.trim() : "";
  const password = typeof body.password === "string" ? body.password : "";

  if (!email || !password) {
    return Response.json({ error: "Email and password required" }, { status: 400 });
  }

  if (password.length < 8) {
    return Response.json({ error: "Password must be at least 8 characters" }, { status: 400 });
  }

  try {
    const passwordHash = await hashPassword(password);
    const [newUser] = await db
      .insert(adminUsers)
      .values({ email, passwordHash })
      .returning();

    return Response.json(
      { id: newUser.id, email: newUser.email, createdAt: newUser.createdAt, isCurrent: false },
      { status: 201 }
    );
  } catch (error) {
    if (isUniqueViolation(error)) {
      return Response.json({ error: "Email already exists" }, { status: 409 });
    }
    throw error;
  }
}

// Drizzle wraps the driver's error in a DrizzleQueryError, so Postgres's unique_violation
// code (23505) may be on the error itself or on its `cause`.
function isUniqueViolation(error: unknown): boolean {
  const e = error as { code?: string; cause?: { code?: string } } | null;
  return e?.code === "23505" || e?.cause?.code === "23505";
}
