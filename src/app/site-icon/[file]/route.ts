import { NextResponse } from "next/server";
import {
  iconCacheHeaders,
  loadSiteIconSettings,
  renderAdaptiveSvg,
  renderIconPng,
} from "@/lib/site-icon";

const PNG_SIZES: Record<string, number> = {
  "icon-32.png": 32,
  "icon-192.png": 192,
  "icon-512.png": 512,
};

export async function GET(req: Request, { params }: { params: Promise<{ file: string }> }) {
  const { file } = await params;
  const { version, background } = await loadSiteIconSettings();

  try {
    if (file === "icon.svg") {
      return new NextResponse(await renderAdaptiveSvg(), {
        headers: iconCacheHeaders(req.url, version, "image/svg+xml"),
      });
    }
    if (file === "apple-icon.png") {
      const png = await renderIconPng("light", 180, { background });
      return new NextResponse(new Uint8Array(png), { headers: iconCacheHeaders(req.url, version, "image/png") });
    }
    const size = PNG_SIZES[file];
    if (size) {
      const png = await renderIconPng("light", size);
      return new NextResponse(new Uint8Array(png), { headers: iconCacheHeaders(req.url, version, "image/png") });
    }
  } catch {
    return NextResponse.json({ error: "Icon could not be rendered" }, { status: 500 });
  }
  return NextResponse.json({ error: "Not found" }, { status: 404 });
}
