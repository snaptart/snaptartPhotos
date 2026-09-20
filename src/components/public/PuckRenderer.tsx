"use client";

import { useRef } from "react";
import { Render } from "@puckeditor/core";
import type { Data } from "@puckeditor/core";
import { puckConfig, ImageCounterContext } from "@/lib/puck/config";
import type { EmbedPhoto, FieldMapBlockData, GlobalLightboxSettings } from "@/lib/puck/config";
import type { IndexStory } from "@/components/public/stories/StoriesIndex";

export interface PuckRendererProps {
  data: Data;
  galleryPhotos?: Record<string, EmbedPhoto[]>;
  globalLightbox?: GlobalLightboxSettings;
  storiesIndex?: IndexStory[];
  fieldMap?: FieldMapBlockData | null;
}

export default function PuckRenderer({ data, galleryPhotos, globalLightbox, storiesIndex, fieldMap }: PuckRendererProps) {
  const counterRef = useRef(0);
  const ctx = useRef({ next: () => counterRef.current++ });

  return (
    <ImageCounterContext.Provider value={ctx.current}>
      <Render
        config={puckConfig}
        data={data}
        metadata={{ galleryPhotos: galleryPhotos ?? {}, globalLightbox, storiesIndex, fieldMap }}
      />
    </ImageCounterContext.Provider>
  );
}
