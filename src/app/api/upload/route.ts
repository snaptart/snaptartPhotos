import { NextResponse } from "next/server";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { getAdminSession } from "@/lib/auth";
import { allowedTypes, MAX_UPLOAD_BYTES } from "@/lib/upload-rules";

// Issues the short-lived token the browser uses to upload a file straight to Blob
// (see uploadImage in src/lib/client-upload.ts). Files never pass through here, so
// Vercel's 4.5MB request limit doesn't apply. The thumbnail and EXIF step runs after
// the upload, in /api/upload/process.
export async function POST(req: Request) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = (await req.json()) as HandleUploadBody;
    const result = await handleUpload({
      body,
      request: req,
      onBeforeGenerateToken: async (_pathname, clientPayload) => ({
        allowedContentTypes: allowedTypes(clientPayload === "asset" ? "asset" : "photo"),
        maximumSizeInBytes: MAX_UPLOAD_BYTES,
      }),
    });
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Upload failed" }, { status: 400 });
  }
}
