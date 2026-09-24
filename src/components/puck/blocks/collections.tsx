"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { textStyleCss, type TextStyleValue } from "@/lib/theme/text-style-value";
import { fetchGalleries, type GalleryListRow } from "@/lib/galleries-client";
import { Editable } from "@/components/puck/inline/Editable";

/**
 * Next Collection — the large link at the foot of a collection page that
 * leads on to the next collection in the admin's gallery order.
 */

const RULE = "1px solid var(--theme-color-rule, #e0dcd3)";

export type NextCollectionProps = {
  /** The collection this page shows; the link goes to the one after it. */
  gallerySlug: string;
  label: string;
  labelStyle: TextStyleValue;
  titleStyle: TextStyleValue;
  /** After the last collection, lead back to the first. */
  wrap: boolean;
  marginTop: number;
  marginBottom: number;
};

type GalleryRow = GalleryListRow;

/** The collection after `slug` among the published ones, in admin order. */
function nextAfter(rows: GalleryRow[], slug: string, wrap: boolean): GalleryRow | null {
  const published = rows.filter((g) => g.isPublished).sort((a, b) => a.position - b.position);
  const i = published.findIndex((g) => g.slug === slug);
  if (i === -1 || published.length < 2) return null;
  if (i + 1 < published.length) return published[i + 1];
  return wrap ? published[0] : null;
}

export function NextCollectionRender({ editing, ...p }: NextCollectionProps & { editing?: boolean }) {
  const [rows, setRows] = useState<GalleryRow[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchGalleries().then((data) => !cancelled && setRows(data));
    return () => {
      cancelled = true;
    };
  }, []);

  const spacing: CSSProperties = { marginTop: p.marginTop ?? 0, marginBottom: p.marginBottom ?? 0 };
  const next = rows && p.gallerySlug ? nextAfter(rows, p.gallerySlug, p.wrap ?? true) : null;

  if (!next) {
    if (!editing) return null;
    return (
      <div style={spacing} className="rounded border border-dashed border-neutral-300 p-6 text-center text-sm text-neutral-500">
        {!p.gallerySlug
          ? "Choose the collection this page shows."
          : rows === null
            ? "Loading…"
            : "No collection comes after this one."}
      </div>
    );
  }

  return (
    <a
      href={next.href ?? `/gallery/${next.slug}`}
      className="group flex flex-wrap items-center justify-between gap-x-6 gap-y-3"
      style={{ ...spacing, padding: "40px 0", borderTop: RULE, borderBottom: RULE, textDecoration: "none", color: "inherit" }}
    >
      <span style={textStyleCss(p.labelStyle, "label")}>
        <Editable path="label" value={p.label} />
      </span>
      <span className="flex items-center gap-5">
        <span className="transition-opacity group-hover:opacity-75" style={textStyleCss(p.titleStyle, "display")}>
          {next.title}
        </span>
        <svg
          width="34"
          height="14"
          viewBox="0 0 34 14"
          fill="none"
          stroke="var(--theme-color-accent, #a4441f)"
          strokeWidth="1.4"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          className="shrink-0 transition-transform group-hover:translate-x-1"
        >
          <path d="M0 7h32M26 1l6 6-6 6" />
        </svg>
      </span>
    </a>
  );
}
