import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";
import { selectPhotoUsage } from "@/lib/db/photo-usage";

/** Per photo id: how many galleries it's in and which pages/stories use it. Admin-only. */
export async function GET() {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    return NextResponse.json(await selectPhotoUsage());
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
