"use client";

import { useState, type CSSProperties, type ReactNode } from "react";
import Lightbox, { type LightboxPhoto, type LightboxSettings } from "@/components/public/Lightbox";
import { GALLERY_ASPECT_CSS, GALLERY_ASPECT_OPTIONS, type GalleryAspect } from "@/lib/theme/aspect";
import { textStyleCss, type TextStyleValue } from "@/lib/theme/text-style-value";
import { responsiveGrid, type PhoneColumns, type TabletColumns } from "@/lib/puck/responsive";
import { freshPhoto, type LibraryPhoto, type PhotoRef } from "@/lib/puck/photo-ref";
import { Editable } from "@/components/puck/inline/Editable";

/**
 * Photograph blocks from the design canvas:
 *   Photo Plate    — one photograph, with its title and a details line under a rule
 *   Selected Work  — hand-picked photographs in a grid, title-only captions
 * Both open the site lightbox; photographs dim slightly on hover.
 */

const RULE = "1px solid var(--theme-color-rule, #e0dcd3)";

type Spacing = { marginTop: number; marginBottom: number };
const spacing = (p: Spacing): CSSProperties => ({ marginTop: p.marginTop ?? 0, marginBottom: p.marginBottom ?? 0 });

/** The shared crops, plus the wide shapes the design uses for full-width plates. */
export type PlateAspect = GalleryAspect | "8:3" | "3:1";
export const PLATE_ASPECT_OPTIONS: { label: string; value: PlateAspect }[] = [
  ...GALLERY_ASPECT_OPTIONS.filter((o) => o.value !== "natural"),
  { label: "8:3 (wide plate)", value: "8:3" },
  { label: "3:1 (panorama)", value: "3:1" },
  { label: "Natural (no crop)", value: "natural" },
];
const PLATE_ASPECT_CSS: Record<string, string | undefined> = { ...GALLERY_ASPECT_CSS, "8:3": "8/3", "3:1": "3/1" };

/**
 * What the renderer passes down: the page's library photos and lightbox
 * settings, and whether the block is in the editor (where an empty block
 * shows a placeholder; on the site it shows nothing).
 */
export type PhotoBlockContext = { library?: Record<string, LibraryPhoto>; lightbox?: LightboxSettings; editing?: boolean };

const displayTitle = (p: PhotoRef) => p.titleOverride || p.title || "";

function toLightbox(p: PhotoRef): LightboxPhoto {
  return {
    id: p.photoId || p.id,
    url: p.url,
    thumbnailUrl: p.thumbnailUrl,
    title: displayTitle(p) || null,
    description: p.description,
    location: p.location,
    cameraSettings: p.cameraSettings,
    takenAt: p.takenAt,
    width: p.width,
    height: p.height,
  };
}

function Picture({ photo, aspect, alt }: { photo: PhotoRef; aspect: string | undefined; alt: string }) {
  const img = (
    <img
      src={photo.url}
      alt={alt}
      loading="lazy"
      className={
        aspect
          ? "absolute inset-0 h-full w-full object-cover transition-opacity duration-300 group-hover:opacity-[.88]"
          : "block h-auto w-full transition-opacity duration-300 group-hover:opacity-[.88]"
      }
      style={{ objectPosition: `${photo.focalX ?? 50}% ${photo.focalY ?? 50}%` }}
    />
  );
  return aspect ? (
    <div className="relative w-full overflow-hidden" style={{ aspectRatio: aspect }}>
      {img}
    </div>
  ) : (
    img
  );
}

function Placeholder({ aspect, children }: { aspect: string | undefined; children: ReactNode }) {
  return (
    <div
      className="flex w-full items-center justify-center border border-dashed text-center"
      style={{
        aspectRatio: aspect ?? "4/5",
        background: "var(--theme-color-surface, #f2efe9)",
        borderColor: "var(--theme-color-rule, #c9c3b7)",
        ...textStyleCss(undefined, "meta"),
      }}
    >
      {children}
    </div>
  );
}

// ----- Photo Plate -----

export type PhotoPlateProps = Spacing & {
  photo: PhotoRef | null;
  aspectRatio: PlateAspect;
  /** Blank uses the photo's own title. */
  title: string;
  /** Blank uses the photo's location. */
  meta: string;
  showCaption: boolean;
  captionRule: boolean;
  titleStyle: TextStyleValue;
  metaStyle: TextStyleValue;
  onClick: "lightbox" | "link" | "none";
  link: string;
};

export function PhotoPlateRender({ library, lightbox, editing, ...p }: PhotoPlateProps & PhotoBlockContext) {
  const [open, setOpen] = useState(false);
  const aspect = PLATE_ASPECT_CSS[p.aspectRatio ?? "4:5"];
  const photo = p.photo ? freshPhoto(p.photo, library) : null;

  if (!photo) {
    if (!editing) return null;
    return (
      <figure style={{ margin: 0, ...spacing(p) }}>
        <Placeholder aspect={aspect}>Choose a photo</Placeholder>
      </figure>
    );
  }

  const title = p.title || displayTitle(photo);
  const meta = p.meta || photo.location || "";
  const picture = <Picture photo={photo} aspect={aspect} alt={title} />;

  return (
    <figure style={{ margin: 0, ...spacing(p) }}>
      {p.onClick === "lightbox" ? (
        <button type="button" onClick={() => setOpen(true)} className="group block w-full cursor-zoom-in text-left" aria-label={`Enlarge ${title || "photograph"}`}>
          {picture}
        </button>
      ) : p.onClick === "link" && p.link ? (
        <a href={p.link} className="group block">
          {picture}
        </a>
      ) : (
        picture
      )}
      {p.showCaption && (title || meta) && (
        <figcaption
          className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1"
          style={{ marginTop: 18, paddingTop: p.captionRule ? 14 : 0, borderTop: p.captionRule ? RULE : undefined }}
        >
          <span style={textStyleCss(p.titleStyle, "photoTitle")}>
            <Editable path="title" value={p.title} fallback={displayTitle(photo)} />
          </span>
          {meta && (
            <span style={textStyleCss(p.metaStyle, "meta")}>
              <Editable path="meta" value={p.meta} fallback={photo.location ?? ""} />
            </span>
          )}
        </figcaption>
      )}
      {p.onClick === "lightbox" && (
        <Lightbox photos={[toLightbox({ ...photo, titleOverride: p.title || photo.titleOverride })]} selectedIndex={open ? 0 : null} onClose={() => setOpen(false)} settings={lightbox} />
      )}
    </figure>
  );
}

// ----- Selected Work -----

export type SelectedWorkProps = Spacing & {
  photos: PhotoRef[];
  columns: "2" | "3" | "4";
  tabletColumns?: TabletColumns;
  phoneColumns?: PhoneColumns;
  aspectRatio: GalleryAspect;
  columnGap: number;
  rowGap: number;
  showTitles: boolean;
  titleStyle: TextStyleValue;
  onClick: "lightbox" | "none";
};

export function SelectedWorkRender({ library, lightbox, editing, ...p }: SelectedWorkProps & PhotoBlockContext) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const aspect = GALLERY_ASPECT_CSS[p.aspectRatio ?? "4:5"];
  const photos = (p.photos ?? []).map((ref) => freshPhoto(ref, library));

  if (photos.length === 0) {
    if (!editing) return null;
    return (
      <div style={spacing(p)}>
        <Placeholder aspect="16/5">Add photos to show your selected work</Placeholder>
      </div>
    );
  }

  const titleCss = textStyleCss(p.titleStyle, "photoTitle");
  const grid = responsiveGrid(Number(p.columns) || 3, p.tabletColumns, p.phoneColumns);

  return (
    <div className="@container" style={spacing(p)}>
    <div className={grid.className} style={{ ...grid.style, columnGap: p.columnGap, rowGap: p.rowGap }}>
      {photos.map((photo, i) => {
        const title = displayTitle(photo);
        const picture = <Picture photo={photo} aspect={aspect} alt={title} />;
        return (
          <figure key={photo.id} style={{ margin: 0 }}>
            {p.onClick === "lightbox" ? (
              <button type="button" onClick={() => setOpenIndex(i)} className="group block w-full cursor-zoom-in text-left" aria-label={`Enlarge ${title || "photograph"}`}>
                {picture}
              </button>
            ) : (
              picture
            )}
            {p.showTitles && title && (
              <figcaption style={{ ...titleCss, marginTop: 14 }}>
                <Editable path={`photos[${i}].titleOverride`} value={photo.titleOverride} fallback={photo.title ?? ""} />
              </figcaption>
            )}
          </figure>
        );
      })}
      {p.onClick === "lightbox" && (
        <Lightbox photos={photos.map(toLightbox)} selectedIndex={openIndex} onClose={() => setOpenIndex(null)} settings={lightbox} />
      )}
    </div>
    </div>
  );
}
