import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { ImageSourcePropType } from 'react-native';

import { getJson } from './api';
import { PLACES } from './places';

/**
 * A photograph as the journal uses it: three sizes and the words the photographer wrote into
 * the file. The names are the ones the components have always used — `thumb` for grid tiles
 * and station chips, `display` for the journal plate, `src` for the lightbox — so only where
 * they come from has changed.
 *
 * Today `display` and `thumb` are the same 800px copy the site makes on upload. If the grid
 * ever feels heavy, the site's upload route can grow a smaller size and only this file moves.
 */
export type Photograph = {
  id: string;
  src: ImageSourcePropType;
  display: ImageSourcePropType;
  thumb: ImageSourcePropType;
  title?: string;
  caption?: string;
  width?: number;
  height?: number;
};

/** One row of `GET /api/photos?gallerySlug=…`, already ordered by the gallery's own ordering. */
type PhotoRow = {
  id: string;
  url: string;
  thumbnailUrl: string | null;
  title: string | null;
  description: string | null;
  width: number | null;
  height: number | null;
};

type GalleryRow = { slug: string; coverImageUrl: string | null };

type Store = {
  /** Station id → its photographs. A station missing here has not arrived (or has none). */
  byStation: Record<string, Photograph[]>;
  /** Station id → the gallery's cover picture, chosen in the admin. */
  coverByStation: Record<string, ImageSourcePropType | undefined>;
  loading: boolean;
  /** Set when every station failed, so the whole fetch is worth reporting rather than a gap. */
  error?: string;
};

const EMPTY: Photograph[] = [];
const PhotosContext = createContext<Store>({ byStation: {}, coverByStation: {}, loading: true });

function toPhotograph(row: PhotoRow): Photograph {
  // A photograph uploaded before thumbnails existed, or one whose thumbnail failed, still
  // shows — it just costs the full-size file.
  const small = { uri: row.thumbnailUrl ?? row.url };
  return {
    id: row.id,
    src: { uri: row.url },
    display: small,
    thumb: small,
    title: row.title ?? undefined,
    caption: row.description ?? undefined,
    width: row.width ?? undefined,
    height: row.height ?? undefined,
  };
}

/**
 * Fetches every station's gallery once at start-up and holds the result for the session.
 *
 * Stations settle one by one: a gallery that is missing, unpublished or still empty simply
 * has no photographs, which is the same state the journal has always shown for a station
 * with nothing in its folder — so that path doubles as the loading state.
 */
export function PhotosProvider({ children }: { children: ReactNode }) {
  const [store, setStore] = useState<Store>({ byStation: {}, coverByStation: {}, loading: true });

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const covers = await getJson<GalleryRow[]>('/api/galleries')
        .then((rows) => new Map(rows.map((g) => [g.slug, g.coverImageUrl])))
        .catch(() => new Map<string, string | null>());

      const results = await Promise.allSettled(
        PLACES.map((place) =>
          getJson<PhotoRow[]>(`/api/photos?gallerySlug=${encodeURIComponent(place.gallery)}`),
        ),
      );
      if (cancelled) return;

      const byStation: Record<string, Photograph[]> = {};
      const coverByStation: Record<string, ImageSourcePropType | undefined> = {};
      const failures: string[] = [];

      results.forEach((result, i) => {
        const place = PLACES[i];
        if (result.status === 'rejected') {
          failures.push(`${place.gallery}: ${result.reason?.message ?? result.reason}`);
          return;
        }
        byStation[place.id] = result.value.map(toPhotograph);
        const cover = covers.get(place.gallery);
        if (cover) coverByStation[place.id] = { uri: cover };
      });

      if (failures.length) console.warn(`[photos] ${failures.join(' · ')}`);
      setStore({
        byStation,
        coverByStation,
        loading: false,
        error: failures.length === PLACES.length ? failures[0] : undefined,
      });
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return <PhotosContext.Provider value={store}>{children}</PhotosContext.Provider>;
}

/** A station's photographs, in the order they were dragged into in the admin. */
export function usePhotos(stationId: string): Photograph[] {
  return useContext(PhotosContext).byStation[stationId] ?? EMPTY;
}

/**
 * The picture standing for a station in the sidebar list and the phone rail: the gallery's
 * cover image if one was chosen in the admin, otherwise its first photograph — the same
 * "thumbnail picked apart from the first photo" the arrange page used to offer.
 */
export function useStationThumbnail(stationId: string): ImageSourcePropType | undefined {
  const { byStation, coverByStation } = useContext(PhotosContext);
  return coverByStation[stationId] ?? byStation[stationId]?.[0]?.thumb;
}

/** Whether the start-up fetch is still running, and what went wrong if all of it failed. */
export function usePhotosStatus(): { loading: boolean; error?: string } {
  const { loading, error } = useContext(PhotosContext);
  return useMemo(() => ({ loading, error }), [loading, error]);
}
