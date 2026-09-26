import "server-only";
import { cache, createElement } from "react";
import sharp from "sharp";
import { ImageResponse } from "next/og";
import { db } from "@/lib/db";
import { siteSettings, themes } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { resolveTheme } from "@/lib/theme/types";
import siteConfig from "@/lib/site.config";

/**
 * Site icons are stored as one uploaded source image (any size, PNG/SVG/…) per variant.
 * /site-icon/[file], /favicon.ico and /manifest.webmanifest resize it on request;
 * with no upload, they draw the site name's first letter instead.
 */

export type SiteIconSettings = {
  siteTitle: string;
  faviconUrl: string | null;
  faviconDarkUrl: string | null;
  /** "round" crops the icon to a circle; anything else keeps the whole image, square. */
  shape: "square" | "round";
  shareImageUrl: string | null;
  /** Theme background, used behind the Apple icon (iOS shows transparency as black). */
  background: string;
  text: string;
  /** Changes whenever an icon changes, so browsers refetch. */
  version: string;
};

export const loadSiteIconSettings = cache(async (): Promise<SiteIconSettings> => {
  let row: typeof siteSettings.$inferSelect | undefined;
  let theme = resolveTheme();
  try {
    [row] = await db.select().from(siteSettings).limit(1);
    if (row?.activeThemeId) {
      const [t] = await db.select().from(themes).where(eq(themes.id, row.activeThemeId)).limit(1);
      if (t) theme = resolveTheme(t.themeSettings as Record<string, unknown>);
    }
  } catch {
    // DB not available — fall back to the monogram
  }
  const siteTitle = row?.siteTitle || siteConfig.siteName;
  const faviconUrl = row?.faviconUrl ?? null;
  const faviconDarkUrl = row?.faviconDarkUrl ?? null;
  const background = theme.colorSiteBg || "#ffffff";
  const shape = row?.faviconShape === "round" ? "round" : "square";
  return {
    siteTitle,
    faviconUrl,
    faviconDarkUrl,
    shape,
    shareImageUrl: row?.shareImageUrl ?? null,
    background,
    text: theme.colorText || "#171717",
    version: hash([faviconUrl, faviconDarkUrl, faviconUrl ? "" : siteTitle, background, shape].join("|")),
  };
});

function hash(s: string): string {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}

async function fetchSource(url: string): Promise<Buffer | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return Buffer.from(await res.arrayBuffer());
  } catch {
    return null;
  }
}

/** The site name's first letter on a dark square — the same mark as the admin avatar. */
async function monogram(title: string, size: number): Promise<Buffer> {
  const letter = (title.trim().charAt(0) || "s").toLowerCase();
  const res = new ImageResponse(
    createElement(
      "div",
      {
        style: {
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#171717",
          color: "#ffffff",
          fontSize: size * 0.7,
          lineHeight: 1,
          paddingBottom: size * 0.08,
        },
      },
      letter,
    ),
    { width: size, height: size },
  );
  return Buffer.from(await res.arrayBuffer());
}

/**
 * A square PNG of the icon. Square: the source is fitted inside (never cropped).
 * Round: the source fills the square and is cropped to a circle, with see-through corners.
 * `background` fills transparent areas (and a round icon's corners).
 */
export async function renderIconPng(
  variant: "light" | "dark",
  size: number,
  opts: { background?: string } = {},
): Promise<Buffer> {
  const s = await loadSiteIconSettings();
  const url = variant === "dark" ? s.faviconDarkUrl ?? s.faviconUrl : s.faviconUrl;
  const source = url ? await fetchSource(url) : null;
  const input = source ?? (await monogram(s.siteTitle, Math.max(size, 64)));

  const round = s.shape === "round";
  let png = await sharp(input, { density: 384 })
    .resize(size, size, { fit: round ? "cover" : "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();
  if (round) {
    const circle = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}" fill="#fff"/></svg>`;
    png = await sharp(png).composite([{ input: Buffer.from(circle), blend: "dest-in" }]).png().toBuffer();
  }
  if (opts.background) png = await sharp(png).flatten({ background: opts.background }).png().toBuffer();
  return png;
}

/** A multi-size .ico with PNG-compressed entries (supported by every browser since IE Vista). */
export function encodeIco(pngs: { size: number; data: Buffer }[]): Buffer {
  const header = Buffer.alloc(6 + 16 * pngs.length);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(pngs.length, 4);
  let offset = header.length;
  pngs.forEach(({ size, data }, i) => {
    const e = 6 + i * 16;
    header.writeUInt8(size >= 256 ? 0 : size, e);
    header.writeUInt8(size >= 256 ? 0 : size, e + 1);
    header.writeUInt8(0, e + 2);
    header.writeUInt8(0, e + 3);
    header.writeUInt16LE(1, e + 4);
    header.writeUInt16LE(32, e + 6);
    header.writeUInt32LE(data.length, e + 8);
    header.writeUInt32LE(offset, e + 12);
    offset += data.length;
  });
  return Buffer.concat([header, ...pngs.map((p) => p.data)]);
}

/**
 * An SVG favicon that swaps between the light and dark icon with the browser's colour scheme.
 * Browsers without SVG favicons (Safari) use the PNG links instead.
 */
export async function renderAdaptiveSvg(): Promise<string> {
  const [light, dark] = await Promise.all([renderIconPng("light", 64), renderIconPng("dark", 64)]);
  const img = (cls: string, png: Buffer) =>
    `<image class="${cls}" width="64" height="64" href="data:image/png;base64,${png.toString("base64")}"/>`;
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">` +
    `<style>.d{display:none}@media (prefers-color-scheme:dark){.l{display:none}.d{display:inline}}</style>` +
    img("l", light) +
    img("d", dark) +
    `</svg>`
  );
}

/**
 * Open Graph images for a page: its own image, else the site's default share image.
 * (A page that sets `openGraph` replaces the root layout's, so it has to carry the default itself.)
 */
export async function shareImagesOr(own: string | null | undefined): Promise<string[] | undefined> {
  if (own) return [own];
  const { shareImageUrl } = await loadSiteIconSettings();
  return shareImageUrl ? [shareImageUrl] : undefined;
}

/** Response headers: long-lived when the URL carries the current version, short otherwise. */
export function iconCacheHeaders(requestUrl: string, version: string, contentType: string): HeadersInit {
  const v = new URL(requestUrl).searchParams.get("v");
  return {
    "Content-Type": contentType,
    "Cache-Control":
      v === version
        ? "public, max-age=31536000, immutable"
        : "public, max-age=3600, s-maxage=300, stale-while-revalidate=86400",
  };
}
