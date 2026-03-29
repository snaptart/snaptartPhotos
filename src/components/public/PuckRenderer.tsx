"use client";

import { Render } from "@puckeditor/core";
import type { Data } from "@puckeditor/core";
import { puckConfig } from "@/lib/puck/config";
import type { EmbedPhoto, GlobalLightboxSettings } from "@/lib/puck/config";

export interface PuckRendererProps {
  data: Data;
  galleryPhotos?: Record<string, EmbedPhoto[]>;
  globalLightbox?: GlobalLightboxSettings;
}

export default function PuckRenderer({ data, galleryPhotos, globalLightbox }: PuckRendererProps) {
  return <Render config={puckConfig} data={data} metadata={{ galleryPhotos: galleryPhotos ?? {}, globalLightbox }} />;
}
