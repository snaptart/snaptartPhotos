import { upload } from "@vercel/blob/client";
import { uploadProblem, type UploadKind } from "@/lib/upload-rules";

/**
 * Uploads an image from the browser straight to Blob storage, then has the server
 * process it (/api/upload/process): a thumbnail and metadata for photos, the size for
 * assets. Uploading directly avoids Vercel's 4.5MB request limit on server routes.
 * Resolves with the process route's JSON; throws an Error with a readable message.
 */
export async function uploadImage(file: File, { folder, kind = "photo" }: { folder: string; kind?: UploadKind }) {
  const problem = uploadProblem(file, kind);
  if (problem) throw new Error(problem);

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  let url: string;
  try {
    const blob = await upload(`${folder}/${Date.now()}-${safeName}`, file, {
      access: "public",
      contentType: file.type,
      handleUploadUrl: "/api/upload",
      clientPayload: kind,
    });
    url = blob.url;
  } catch (err) {
    throw new Error(err instanceof Error && err.message ? err.message : "Upload failed.");
  }

  const res = await fetch("/api/upload/process", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url, kind }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Upload failed.");
  return data;
}
