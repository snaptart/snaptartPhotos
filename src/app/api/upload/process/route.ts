import { NextResponse } from "next/server";
import { del, head, put } from "@vercel/blob";
import sharp from "sharp";
import { getAdminSession } from "@/lib/auth";
import { extractPhotoMetadata } from "@/lib/photo-exif";

const THUMBNAIL_WIDTH = 800;

// Second step of an upload: the browser has put the file in Blob, and this reads it
// back to make the thumbnail and read the photo's metadata. A photo that can't be
// processed is deleted again, so a failed upload doesn't leave an orphan behind.
export async function POST(req: Request) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { url, kind } = (await req.json().catch(() => ({}))) as { url?: string; kind?: string };
  if (!url) return NextResponse.json({ error: "No file provided" }, { status: 400 });

  // head() only finds blobs in this site's own store, so nothing else can be fetched.
  const blob = await head(url).catch(() => null);
  if (!blob) return NextResponse.json({ error: "Uploaded file not found" }, { status: 404 });

  let buffer: Buffer;
  try {
    const res = await fetch(blob.url);
    if (!res.ok) throw new Error();
    buffer = Buffer.from(await res.arrayBuffer());
  } catch {
    return NextResponse.json({ error: "Couldn't read the uploaded file" }, { status: 500 });
  }

  // "asset" uploads (site icons, share images) skip the thumbnail and photo metadata, and may be SVG.
  if (kind === "asset") {
    const { width = null, height = null } = await sharp(buffer).metadata().catch(() => ({ width: null, height: null }));
    return NextResponse.json({ url: blob.url, width, height });
  }

  try {
    // Extract EXIF / IPTC / XMP metadata + dimensions
    const metadata = await extractPhotoMetadata(buffer);

    // Generate and upload thumbnail
    const thumbnailBuffer = await sharp(buffer)
      .rotate() // honor EXIF orientation so thumbs aren't sideways
      .resize({ width: THUMBNAIL_WIDTH, withoutEnlargement: true })
      .jpeg({ quality: 80 })
      .toBuffer();

    // galleries/123-name.png -> galleries/thumbs/123-name.jpg
    const slash = blob.pathname.lastIndexOf("/");
    const thumbFilename = `${blob.pathname.slice(0, slash + 1)}thumbs/${blob.pathname.slice(slash + 1).replace(/\.[^.]+$/, "")}.jpg`;
    const thumbBlob = await put(thumbFilename, thumbnailBuffer, {
      access: "public",
      contentType: "image/jpeg",
    });

    return NextResponse.json({
      blobUrl: blob.url,
      url: blob.url,
      thumbnailUrl: thumbBlob.url,
      width: metadata.width,
      height: metadata.height,
      takenAt: metadata.takenAt?.toISOString() ?? null,
      latitude: metadata.latitude,
      longitude: metadata.longitude,
      location: metadata.location,
      title: metadata.title,
      description: metadata.description,
      tags: metadata.tags,
      cameraSettings: metadata.cameraSettings,
    });
  } catch {
    await del(blob.url).catch(() => {});
    return NextResponse.json({ error: "Couldn't process the photo" }, { status: 500 });
  }
}
