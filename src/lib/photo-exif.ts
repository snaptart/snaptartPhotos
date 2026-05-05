import exifr from "exifr";
import sharp from "sharp";

export type CameraSettings = {
  make?: string;
  model?: string;
  lens?: string;
  iso?: number;
  aperture?: number;
  shutterSpeed?: number;
  shutterSpeedText?: string;
  focalLength?: number;
  focalLength35?: number;
  exposureMode?: string;
  meteringMode?: string;
  whiteBalance?: string;
  flash?: string;
  exposureCompensation?: number;
};

export type ExtractedPhotoMetadata = {
  width: number;
  height: number;
  takenAt: Date | null;
  latitude: number | null;
  longitude: number | null;
  location: string | null;
  description: string | null;
  tags: string[] | null;
  cameraSettings: CameraSettings | null;
};

export async function extractPhotoMetadata(buffer: Buffer): Promise<ExtractedPhotoMetadata> {
  const { width, height } = await readDimensions(buffer);

  let raw: Record<string, unknown> | undefined;
  try {
    // Passing `true` enables every segment (TIFF/EXIF/IPTC/XMP/GPS) — exifr's
    // typed per-segment options are finicky and we want the whole picture.
    raw = (await exifr.parse(buffer, true)) as Record<string, unknown> | undefined;
  } catch {
    raw = undefined;
  }

  return {
    width,
    height,
    takenAt: pickTakenAt(raw),
    latitude: pickNumber(raw, "latitude"),
    longitude: pickNumber(raw, "longitude"),
    location: pickLocation(raw),
    description: pickDescription(raw),
    tags: pickTags(raw),
    cameraSettings: pickCameraSettings(raw),
  };
}

async function readDimensions(buffer: Buffer): Promise<{ width: number; height: number }> {
  const meta = await sharp(buffer).metadata();
  const orientation = meta.orientation ?? 1;
  const w = meta.width ?? 0;
  const h = meta.height ?? 0;
  // Orientations 5-8 swap width/height; sharp's reported width/height are the file's stored values.
  const swapped = orientation >= 5 && orientation <= 8;
  return swapped ? { width: h, height: w } : { width: w, height: h };
}

function pickTakenAt(raw: Record<string, unknown> | undefined): Date | null {
  if (!raw) return null;
  const candidates = ["DateTimeOriginal", "CreateDate", "DateCreated", "DateTime"];
  for (const key of candidates) {
    const v = raw[key];
    if (v instanceof Date && !Number.isNaN(v.getTime())) return v;
    if (typeof v === "string") {
      const parsed = new Date(v);
      if (!Number.isNaN(parsed.getTime())) return parsed;
    }
  }
  return null;
}

function pickNumber(raw: Record<string, unknown> | undefined, key: string): number | null {
  if (!raw) return null;
  const v = raw[key];
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

function pickLocation(raw: Record<string, unknown> | undefined): string | null {
  if (!raw) return null;
  const parts: string[] = [];
  for (const key of ["Sublocation", "Location", "City", "State", "Country"]) {
    const v = raw[key];
    if (typeof v === "string" && v.trim()) {
      const trimmed = v.trim();
      if (!parts.includes(trimmed)) parts.push(trimmed);
    }
  }
  return parts.length ? parts.join(", ") : null;
}

function pickDescription(raw: Record<string, unknown> | undefined): string | null {
  if (!raw) return null;
  const direct = raw.Caption ?? raw.ImageDescription;
  if (typeof direct === "string" && direct.trim()) return direct.trim();
  const xmp = raw.description;
  if (xmp && typeof xmp === "object" && "value" in xmp) {
    const v = (xmp as { value?: unknown }).value;
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  if (typeof xmp === "string" && xmp.trim()) return xmp.trim();
  return null;
}

function pickTags(raw: Record<string, unknown> | undefined): string[] | null {
  if (!raw) return null;
  const candidates = [raw.Keywords, raw.subject];
  for (const c of candidates) {
    if (Array.isArray(c)) {
      const tags = c.filter((t): t is string => typeof t === "string" && t.trim().length > 0);
      if (tags.length) return Array.from(new Set(tags));
    }
    if (typeof c === "string" && c.trim()) {
      return [c.trim()];
    }
  }
  return null;
}

function pickCameraSettings(raw: Record<string, unknown> | undefined): CameraSettings | null {
  if (!raw) return null;
  const out: CameraSettings = {};

  const make = strOf(raw.Make);
  const model = strOf(raw.Model);
  const lens = strOf(raw.LensModel) ?? strOf(raw.Lens);
  if (make) out.make = make;
  if (model) out.model = model;
  if (lens) out.lens = lens;

  const iso = numOf(raw.ISO);
  const aperture = numOf(raw.FNumber) ?? numOf(raw.ApertureValue);
  const shutter = numOf(raw.ExposureTime);
  const focal = numOf(raw.FocalLength);
  const focal35 = numOf(raw.FocalLengthIn35mmFormat);

  if (iso !== null) out.iso = iso;
  if (aperture !== null) out.aperture = round(aperture, 1);
  if (shutter !== null) {
    out.shutterSpeed = shutter;
    out.shutterSpeedText = formatShutter(shutter);
  }
  if (focal !== null) out.focalLength = round(focal, 1);
  if (focal35 !== null) out.focalLength35 = round(focal35, 1);

  const exposureMode = strOf(raw.ExposureMode);
  const meteringMode = strOf(raw.MeteringMode);
  const whiteBalance = strOf(raw.WhiteBalance);
  const flash = strOf(raw.Flash);
  const compensation = numOf(raw.ExposureCompensation);
  if (exposureMode) out.exposureMode = exposureMode;
  if (meteringMode) out.meteringMode = meteringMode;
  if (whiteBalance) out.whiteBalance = whiteBalance;
  if (flash) out.flash = flash;
  if (compensation !== null) out.exposureCompensation = round(compensation, 2);

  return Object.keys(out).length ? out : null;
}

function strOf(v: unknown): string | undefined {
  return typeof v === "string" && v.trim() ? v.trim() : undefined;
}

function numOf(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

function round(v: number, decimals: number): number {
  const f = 10 ** decimals;
  return Math.round(v * f) / f;
}

function formatShutter(seconds: number): string {
  if (seconds >= 1) return `${round(seconds, 1)}s`;
  if (seconds <= 0) return `${seconds}s`;
  const denom = Math.round(1 / seconds);
  return `1/${denom}`;
}
