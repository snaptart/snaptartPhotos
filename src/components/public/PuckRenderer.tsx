"use client";

import { useMemo, useRef } from "react";
import { Render } from "@puckeditor/core";
import type { Data } from "@puckeditor/core";
import { puckConfig, ImageCounterContext } from "@/lib/puck/config";
import type { EmbedPhoto, FieldMapBlockData, GlobalLightboxSettings } from "@/lib/puck/config";
import type { IndexStory } from "@/components/public/stories/StoriesIndex";
import type { LibraryPhoto } from "@/lib/puck/photo-ref";
import { buildGoogleFontsUrl, collectRichTextFonts } from "@/lib/theme/fonts";

export interface PuckRendererProps {
  data: Data;
  galleryPhotos?: Record<string, EmbedPhoto[]>;
  globalLightbox?: GlobalLightboxSettings;
  storiesIndex?: IndexStory[];
  fieldMap?: FieldMapBlockData | null;
  /** Current library copies of photos picked into Selected Work / Photo Plate blocks. */
  photosById?: Record<string, LibraryPhoto>;
}

export default function PuckRenderer({ data, galleryPhotos, globalLightbox, storiesIndex, fieldMap, photosById }: PuckRendererProps) {
  const counterRef = useRef(0);
  const ctx = useRef({ next: () => counterRef.current++ });
  // The public layout only loads the theme's fonts; add any picked inside rich text.
  const fontsUrl = useMemo(() => buildGoogleFontsUrl(collectRichTextFonts(data)), [data]);

  return (
    <ImageCounterContext.Provider value={ctx.current}>
      {fontsUrl && <link rel="stylesheet" href={fontsUrl} />}
      <Render
        config={puckConfig}
        data={data}
        metadata={{ galleryPhotos: galleryPhotos ?? {}, globalLightbox, storiesIndex, fieldMap, photosById: photosById ?? {} }}
      />
    </ImageCounterContext.Provider>
  );
}
