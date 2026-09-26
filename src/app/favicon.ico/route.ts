import { NextResponse } from "next/server";
import { encodeIco, iconCacheHeaders, loadSiteIconSettings, renderIconPng } from "@/lib/site-icon";

// Browsers and crawlers ask for /favicon.ico directly, whatever the page's <link> tags say.
export async function GET(req: Request) {
  const { version } = await loadSiteIconSettings();
  try {
    const sizes = [16, 32, 48];
    const pngs = await Promise.all(sizes.map(async (size) => ({ size, data: await renderIconPng("light", size) })));
    return new NextResponse(new Uint8Array(encodeIco(pngs)), {
      headers: iconCacheHeaders(req.url, version, "image/x-icon"),
    });
  } catch {
    return NextResponse.json({ error: "Icon could not be rendered" }, { status: 500 });
  }
}
