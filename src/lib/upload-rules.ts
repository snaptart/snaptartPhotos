// Upload rules shared by the browser (checked before uploading, for clear messages)
// and the server (written into the Blob upload token, so Blob enforces them).

export const PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"];
/** Site assets (icons, share images) may also be SVG. */
export const ASSET_TYPES = [...PHOTO_TYPES, "image/svg+xml"];

export const MAX_UPLOAD_BYTES = 20 * 1024 * 1024; // 20MB

export type UploadKind = "photo" | "asset";

export function allowedTypes(kind: UploadKind) {
  return kind === "asset" ? ASSET_TYPES : PHOTO_TYPES;
}

/** The reason a file can't be uploaded, or null if it can. */
export function uploadProblem(file: File, kind: UploadKind): string | null {
  if (!allowedTypes(kind).includes(file.type)) {
    return `Invalid file type. Only JPEG, PNG, WebP, GIF${kind === "asset" ? ", AVIF and SVG" : " and AVIF"} are allowed.`;
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return `File too large (max ${MAX_UPLOAD_BYTES / 1024 / 1024}MB).`;
  }
  return null;
}
