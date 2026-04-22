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
};
