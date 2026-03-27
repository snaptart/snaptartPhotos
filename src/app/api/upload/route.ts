import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { put } from "@vercel/blob";

export async function POST(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

  const folder = (formData.get("folder") as string) || "snaptart";
  const filename = `${folder}/${Date.now()}-${file.name}`;

  const blob = await put(filename, file, { access: "public" });

  return NextResponse.json({
    blobUrl: blob.url,
    url: blob.url,
  });
}
