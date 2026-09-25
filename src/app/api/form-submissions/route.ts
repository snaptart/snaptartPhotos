import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { formSubmissions, siteSettings } from "@/lib/db/schema";
import { eq, desc, and, gte, count } from "drizzle-orm";
import { sendFormNotification } from "@/lib/resend";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const formName = req.nextUrl.searchParams.get("formName");
    const rows = formName
      ? await db
          .select()
          .from(formSubmissions)
          .where(eq(formSubmissions.formName, formName))
          .orderBy(desc(formSubmissions.submittedAt))
      : await db
          .select()
          .from(formSubmissions)
          .orderBy(desc(formSubmissions.submittedAt));
    return NextResponse.json(rows);
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { formName, data, _sa_p } = body;

    // Honeypot check — if filled, silently discard
    if (_sa_p) {
      return NextResponse.json({ success: true });
    }

    if (!formName || !data || typeof data !== "object") {
      return NextResponse.json({ error: "Invalid submission" }, { status: 400 });
    }

    // Basic server-side validation: check required fields
    const requiredFields: string[] = body._requiredFields ?? [];
    for (const field of requiredFields) {
      const val = data[field];
      if (val === undefined || val === null || val === "") {
        return NextResponse.json(
          { error: `Field "${field}" is required` },
          { status: 400 }
        );
      }
    }

    // Email format validation
    const emailFields: string[] = body._emailFields ?? [];
    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    for (const field of emailFields) {
      if (data[field] && !emailRe.test(data[field])) {
        return NextResponse.json(
          { error: `"${field}" must be a valid email address` },
          { status: 400 }
        );
      }
    }

    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      req.headers.get("x-real-ip") ??
      null;

    // Rate limit: max submissions per IP per window, counted against stored
    // submissions so it holds across serverless instances.
    if (ip) {
      const RATE_LIMIT = 5;
      const RATE_WINDOW_MS = 60 * 60 * 1000; // 1 hour
      const [{ recent }] = await db
        .select({ recent: count() })
        .from(formSubmissions)
        .where(
          and(
            eq(formSubmissions.ipAddress, ip),
            gte(formSubmissions.submittedAt, new Date(Date.now() - RATE_WINDOW_MS))
          )
        );
      if (recent >= RATE_LIMIT) {
        return NextResponse.json(
          { error: "Too many submissions. Please try again later." },
          { status: 429 }
        );
      }
    }

    const [row] = await db
      .insert(formSubmissions)
      .values({ formName, data, ipAddress: ip })
      .returning();

    // Email notification: form's own recipient, else the site's contact email.
    // Failures are logged but never fail the request — the submission is stored.
    try {
      const [settings] = await db.select().from(siteSettings).limit(1);
      const recipient = body._recipientEmail || settings?.contactEmail;
      if (recipient) {
        await sendFormNotification({
          to: recipient,
          formName,
          data,
          siteTitle: settings?.siteTitle,
        });
      }
    } catch (err) {
      console.error("Form notification email failed:", err);
    }

    return NextResponse.json({ success: true, id: row.id });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const id = req.nextUrl.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    await db.delete(formSubmissions).where(eq(formSubmissions.id, id));
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
