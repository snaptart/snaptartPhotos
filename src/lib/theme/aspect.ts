/**
 * One aspect-ratio vocabulary for every gallery grid on the site.
 *
 * Before this, three grids each carried their own list and their own map, and
 * they disagreed: GalleryEmbed offered square/natural/4:3/16:9, GalleriesIndex
 * offered those plus 3:2, and the standalone /gallery/[slug] route had 4:5
 * baked in. None of them offered a portrait ratio, which is awkward for a
 * library that is mostly 4:5 portrait.
 *
 * Add a ratio here and it appears in all three.
 */

export type GalleryAspect =
  | "natural"
  | "square"
  | "4:5"
  | "3:4"
  | "2:3"
  | "4:3"
  | "3:2"
  | "16:9";

/** CSS `aspect-ratio` per option. `undefined` = don't constrain, use the photo's own. */
export const GALLERY_ASPECT_CSS: Record<string, string | undefined> = {
  natural: undefined,
  square: "1/1",
  "4:5": "4/5",
  "3:4": "3/4",
  "2:3": "2/3",
  "4:3": "4/3",
  "3:2": "3/2",
  "16:9": "16/9",
};

/** Options for a Puck `select` field, portrait first — it suits this library. */
export const GALLERY_ASPECT_OPTIONS: { label: string; value: GalleryAspect }[] = [
  { label: "4:5 (portrait)", value: "4:5" },
  { label: "3:4 (portrait)", value: "3:4" },
  { label: "2:3 (portrait)", value: "2:3" },
  { label: "Square (1:1)", value: "square" },
  { label: "4:3 (landscape)", value: "4:3" },
  { label: "3:2 (landscape)", value: "3:2" },
  { label: "16:9 (landscape)", value: "16:9" },
  { label: "Natural (no crop)", value: "natural" },
];

export const DEFAULT_GALLERY_ASPECT: GalleryAspect = "4:5";

/** Resolve an option to a CSS value, falling back to the default. */
export function galleryAspectCss(aspect?: GalleryAspect | null): string | undefined {
  return GALLERY_ASPECT_CSS[aspect ?? DEFAULT_GALLERY_ASPECT];
}
