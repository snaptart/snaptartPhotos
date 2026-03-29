import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { put } from "@vercel/blob";

export async function POST(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

  const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"];
  const MAX_SIZE = 20 * 1024 * 1024; // 20MB
  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: "Invalid file type. Only JPEG, PNG, WebP, GIF, and AVIF are allowed." }, { status: 400 });
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: "File too large (max 20MB)" }, { status: 400 });
  }

  const folder = (formData.get("folder") as string) || "snaptart";
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const filename = `${folder}/${Date.now()}-${safeName}`;

  const blob = await put(filename, file, { access: "public" });

  return NextResponse.json({
    blobUrl: blob.url,
    url: blob.url,
  });
}
