"use client";

import { useRef } from "react";
import { Render } from "@puckeditor/core";
import type { Data } from "@puckeditor/core";
import { puckConfig, ImageCounterContext } from "@/lib/puck/config";
import type { EmbedPhoto, GlobalLightboxSettings } from "@/lib/puck/config";

export interface PuckRendererProps {
  data: Data;
  galleryPhotos?: Record<string, EmbedPhoto[]>;
  globalLightbox?: GlobalLightboxSettings;
}

export default function PuckRenderer({ data, galleryPhotos, globalLightbox }: PuckRendererProps) {
  const counterRef = useRef(0);
  const ctx = useRef({ next: () => counterRef.current++ });

  return (
    <ImageCounterContext.Provider value={ctx.current}>
      <Render config={puckConfig} data={data} metadata={{ galleryPhotos: galleryPhotos ?? {}, globalLightbox }} />
    </ImageCounterContext.Provider>
  );
}
