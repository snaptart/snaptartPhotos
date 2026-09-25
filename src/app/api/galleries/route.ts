import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { galleries, galleryPhotos, photos } from "@/lib/db/schema";
import { eq, asc, sql, getTableColumns } from "drizzle-orm";
import { builtCollectionPages, collectionHref } from "@/lib/collections";
import { generateSlug } from "@/lib/utils";
import { corsPreflight, withCors } from "@/lib/cors";

// Readable cross-origin so a separate front end can list galleries — see @/lib/cors.
export const OPTIONS = corsPreflight;

export async function GET() {
  try {
    const session = await auth();

    // photoCount comes from the junction table so the Galleries Index block can show
    // a live count without a second round trip. ::int because Postgres count() is a
    // bigint, which the driver would otherwise hand back as a string.
    // firstPhotoUrl stands in for a missing cover.
    const items = await db
      .select({
        ...getTableColumns(galleries),
        photoCount: sql<number>`count(${galleryPhotos.photoId})::int`,
        firstPhotoUrl: sql<string | null>`(
          select ${photos.url} from ${photos}
          join ${galleryPhotos} gp on gp.photo_id = ${photos.id}
          where gp.gallery_id = ${galleries.id}
          order by gp.position asc limit 1
        )`,
      })
      .from(galleries)
      .leftJoin(galleryPhotos, eq(galleryPhotos.galleryId, galleries.id))
      .where(session ? undefined : eq(galleries.isPublished, true))
      .groupBy(galleries.id)
      .orderBy(asc(galleries.position));

    // Each collection's link: its built page when it has one (see @/lib/collections).
    const built = await builtCollectionPages(items.map((g) => g.slug));
    return withCors(NextResponse.json(items.map((g) => ({ ...g, href: collectionHref(g.slug, built) }))));
  } catch {
    return withCors(NextResponse.json({ error: "Internal server error" }, { status: 500 }));
  }
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const slug = generateSlug(body.title);
    const [item] = await db.insert(galleries).values({ ...body, slug }).returning();
    return NextResponse.json(item);
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();

    // Bulk reorder
    if (body.items && Array.isArray(body.items)) {
      for (const item of body.items) {
        await db.update(galleries).set({ position: item.position }).where(eq(galleries.id, item.id));
      }
      const updated = await db.select().from(galleries).orderBy(asc(galleries.position));
      return NextResponse.json(updated);
    }

    // Single update
    if (!body.id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
    const { id, ...data } = body;
    if (data.title) data.slug = generateSlug(data.title);
    data.updatedAt = new Date();

    const [updated] = await db.update(galleries).set(data).where(eq(galleries.id, id)).returning();
    return NextResponse.json(updated);
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
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    await db.delete(galleries).where(eq(galleries.id, id));
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
