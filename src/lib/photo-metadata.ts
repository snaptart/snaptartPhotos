// Camera-dumped filenames follow one of:
//   YYYYMMDD_HHMMSS_...      (e.g. 20160711_132834_DSC_0463.jpg)
//   YYMMDD_HHMMSS_...        (e.g. 090706_143458_DSC_0016.jpg — assume 20YY)
//   YYYY-MM-DD_HH-MM-SS_...  (e.g. 2007-07-31_10-15-58_P7310188.jpg)
const TAKEN_AT_PATTERNS = [
  /^(\d{4})(\d{2})(\d{2})_(\d{2})(\d{2})(\d{2})(?=\D|$)/,
  /^(\d{4})-(\d{2})-(\d{2})_(\d{2})-(\d{2})-(\d{2})(?=\D|$)/,
  /^(\d{2})(\d{2})(\d{2})_(\d{2})(\d{2})(\d{2})(?=\D|$)/,
];

export function parseFilenameForTakenAt(filename: string | null | undefined): Date | null {
  if (!filename) return null;
  for (const re of TAKEN_AT_PATTERNS) {
    const match = filename.match(re);
    if (!match) continue;
    const [, y, mo, d, h, mi, s] = match;
    let year = Number(y);
    if (y.length === 2) year = 2000 + year;
    const month = Number(mo);
    const day = Number(d);
    const hour = Number(h);
    const minute = Number(mi);
    const second = Number(s);
    if (
      month < 1 || month > 12 ||
      day < 1 || day > 31 ||
      hour > 23 || minute > 59 || second > 59
    ) continue;
    const dt = new Date(Date.UTC(year, month - 1, day, hour, minute, second));
    if (!Number.isNaN(dt.getTime())) return dt;
  }
  return null;
}

// Blob URLs look like `.../galleries/1774645510952-([20160711]_132834_DSC_0463.jpg)` —
// a millisecond prefix, then the original filename (sometimes wrapped in parens).
export function extractFilenameFromBlobUrl(url: string): string | null {
  try {
    const path = new URL(url).pathname;
    const last = path.split("/").pop();
    if (!last) return null;
    const decoded = decodeURIComponent(last);
    const stripped = decoded.replace(/^\d+-/, "");
    const unwrapped = stripped.replace(/^\((.*)\)$/, "$1");
    return unwrapped || null;
  } catch {
    return null;
  }
}
