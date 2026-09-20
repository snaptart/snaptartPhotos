export type MapStyle = "modern" | "mono" | "blueprint";

export type FieldMapFilter = {
  id: string;
  label: string;
  tag?: string;
};

export type FieldMapRegion = {
  id: string;
  slug: string;
  name: string;
  latitude: number;
  longitude: number;
  accentColor: string;
  flavor: string | null;
  totalCount: number;
  tagCounts: Record<string, number>;
  yearRange: [number, number];
  previewThumbs: string[];
  photosByYearTag: Array<{ year: number; tag: string | null }>;
};

export type FieldMapProps = {
  regions: FieldMapRegion[];
  yearBounds: [number, number];
  filters: FieldMapFilter[];
  mapStyle?: MapStyle;
  siteTitle?: string;
  tagline?: string;
  /**
   * "interactive" (default) — full map with pin clicks, filter chips, scrubber, controls.
   * "background" — inert faded/blurred map used behind a region overlay. No controls,
   * no interactivity, no filter chips/scrubber/zoom/cursor readout.
   */
  mode?: "interactive" | "background";
  /** Slug of the pin that should appear highlighted/accented in background mode. */
  highlightSlug?: string;
  /** Show the top-left brand block. Default false. */
  showBrand?: boolean;
  /** Show the centered tag filter chips. Default false. */
  showFilters?: boolean;
  /** Show the bottom dual-handle year scrubber. Default false. */
  showYearScrubber?: boolean;
  /** Override the viewport background (area outside the globe). Defaults to palette.bg. */
  backgroundColor?: string;
};
