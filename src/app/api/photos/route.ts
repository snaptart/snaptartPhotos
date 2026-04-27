import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { photos, galleries, galleryPhotos } from "@/lib/db/schema";
import { eq, asc, inArray, and, sql } from "drizzle-orm";
import { del } from "@vercel/blob";
import {
  selectPhotosForGallery,
  setPhotoGalleries,
  addPhotoToGallery,
  selectGalleryIdsForPhoto,
} from "@/lib/db/photo-queries";

export async function GET(req: Request) {
  try {
    const session = await auth();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const galleryId = searchParams.get("galleryId");
    const gallerySlug = searchParams.get("gallerySlug");

    // Single-photo lookup with all gallery memberships — admin convenience.
    if (id) {
      if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      const [photo] = await db.select().from(photos).where(eq(photos.id, id));
      if (!photo) return NextResponse.json(null);
      const memberships = await selectGalleryIdsForPhoto(id);
      return NextResponse.json({ ...photo, galleryIds: memberships });
    }

    if (galleryId) {
      if (!session) {
        const [gallery] = await db
          .select({ isPublished: galleries.isPublished })
          .from(galleries)
          .where(eq(galleries.id, galleryId));
        if (!gallery?.isPublished) return NextResponse.json([]);
      }
      const items = await selectPhotosForGallery(galleryId);
      return NextResponse.json(items);
    }

    if (gallerySlug) {
      const [gallery] = await db
        .select({ id: galleries.id, isPublished: galleries.isPublished })
        .from(galleries)
        .where(eq(galleries.slug, gallerySlug));
      if (!gallery || (!session && !gallery.isPublished)) return NextResponse.json([]);
      const items = await selectPhotosForGallery(gallery.id);
      return NextResponse.json(items);
    }

    const items = await db.select().from(photos).orderBy(asc(photos.createdAt));
    return NextResponse.json(items);
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    if (Object.prototype.hasOwnProperty.call(body, "takenAt")) {
      body.takenAt = body.takenAt ? new Date(body.takenAt) : null;
    }

    // Accept galleryIds: string[] or legacy galleryId: string
    const galleryIds: string[] = Array.isArray(body.galleryIds)
      ? body.galleryIds.filter(Boolean)
      : body.galleryId
        ? [body.galleryId]
        : [];

    // Strip junction-related fields off the photo insert
    const { galleryIds: _g1, galleryId: _g2, position: _p, ...photoFields } = body;

    const [item] = await db.insert(photos).values(photoFields).returning();

    for (const gid of galleryIds) {
      await addPhotoToGallery(item.id, gid);
    }

    return NextResponse.json({ ...item, galleryIds });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();

    // Bulk reorder within a gallery — updates gallery_photos.position
    if (body.items && Array.isArray(body.items)) {
      const galleryId: string | undefined = body.galleryId;
      if (!galleryId) {
        return NextResponse.json({ error: "Missing galleryId for reorder" }, { status: 400 });
      }
      for (const item of body.items) {
        await db
          .update(galleryPhotos)
          .set({ position: item.position })
          .where(
            and(
              eq(galleryPhotos.galleryId, galleryId),
              eq(galleryPhotos.photoId, item.id)
            )
          );
      }
      const updated = await selectPhotosForGallery(galleryId);
      return NextResponse.json(updated);
    }

    // Bulk metadata update — body: { bulk: { ids: string[], patch: { ... } } }
    // patch.galleryId means "move to this single gallery" (replace memberships).
    // patch.addToGalleryId means "add this gallery to existing memberships."
    if (body.bulk && Array.isArray(body.bulk.ids) && body.bulk.ids.length > 0) {
      const allowed = ["title", "description", "location", "tags"] as const;
      const patch: Record<string, unknown> = {};
      for (const key of allowed) {
        if (Object.prototype.hasOwnProperty.call(body.bulk.patch ?? {}, key)) {
          patch[key] = body.bulk.patch[key];
        }
      }

      const moveToGalleryId: string | undefined = body.bulk.patch?.galleryId;
      const addToGalleryId: string | undefined = body.bulk.patch?.addToGalleryId;

      if (Object.keys(patch).length === 0 && !moveToGalleryId && !addToGalleryId) {
        return NextResponse.json({ error: "No fields to update" }, { status: 400 });
      }

      if (Object.keys(patch).length > 0) {
        patch.updatedAt = new Date();
        await db.update(photos).set(patch).where(inArray(photos.id, body.bulk.ids));
      }

      if (moveToGalleryId) {
        for (const id of body.bulk.ids) {
          await setPhotoGalleries(id, [moveToGalleryId]);
        }
      } else if (addToGalleryId) {
        for (const id of body.bulk.ids) {
          await addPhotoToGallery(id, addToGalleryId);
        }
      }

      return NextResponse.json({ success: true, updated: body.bulk.ids.length });
    }

    // Single update
    if (!body.id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
    const { id, galleryIds, galleryId, position: _pos, ...data } = body;
    if (Object.prototype.hasOwnProperty.call(data, "takenAt")) {
      data.takenAt = data.takenAt ? new Date(data.takenAt) : null;
    }
    data.updatedAt = new Date();

    const [updated] = await db.update(photos).set(data).where(eq(photos.id, id)).returning();

    // Replace gallery memberships if explicitly provided.
    if (Array.isArray(galleryIds)) {
      await setPhotoGalleries(id, galleryIds.filter(Boolean));
    } else if (typeof galleryId === "string" && galleryId) {
      // Legacy single-gallery move.
      await setPhotoGalleries(id, [galleryId]);
    }

    const memberships = await selectGalleryIdsForPhoto(id);
    return NextResponse.json({ ...updated, galleryIds: memberships });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const idsParam = searchParams.get("ids");
    const galleryIdParam = searchParams.get("galleryId");

    // Bulk delete: ?ids=a,b,c
    // If galleryId is also provided, only remove from that one gallery instead of deleting the photo.
    if (idsParam) {
      const ids = idsParam.split(",").filter(Boolean);
      if (ids.length === 0) {
        return NextResponse.json({ error: "Missing ids" }, { status: 400 });
      }
      if (galleryIdParam) {
        await db
          .delete(galleryPhotos)
          .where(
            and(
              eq(galleryPhotos.galleryId, galleryIdParam),
              inArray(galleryPhotos.photoId, ids)
            )
          );
        // Optionally garbage-collect photos that now belong to no galleries.
        await db.execute(sql`
          DELETE FROM photos
          WHERE id = ANY(${ids}::uuid[])
            AND NOT EXISTS (SELECT 1 FROM gallery_photos WHERE photo_id = photos.id)
        `);
        return NextResponse.json({ success: true, removed: ids.length });
      }
      const rows = await db.select().from(photos).where(inArray(photos.id, ids));
      await Promise.allSettled(rows.map((r) => del(r.blobUrl)));
      await db.delete(photos).where(inArray(photos.id, ids));
      return NextResponse.json({ success: true, deleted: ids.length });
    }

    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    if (galleryIdParam) {
      await db
        .delete(galleryPhotos)
        .where(
          and(
            eq(galleryPhotos.galleryId, galleryIdParam),
            eq(galleryPhotos.photoId, id)
          )
        );
      const stillMember = await selectGalleryIdsForPhoto(id);
      if (stillMember.length === 0) {
        const [photo] = await db.select().from(photos).where(eq(photos.id, id));
        if (photo) await del(photo.blobUrl);
        await db.delete(photos).where(eq(photos.id, id));
      }
      return NextResponse.json({ success: true });
    }

    const [photo] = await db.select().from(photos).where(eq(photos.id, id));
    if (photo) await del(photo.blobUrl);

    await db.delete(photos).where(eq(photos.id, id));
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
