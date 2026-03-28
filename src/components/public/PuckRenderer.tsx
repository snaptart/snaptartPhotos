"use client";

import { Render } from "@puckeditor/core";
import type { Data } from "@puckeditor/core";
import { puckConfig } from "@/lib/puck/config";
import type { EmbedPhoto } from "@/lib/puck/config";

export interface PuckRendererProps {
  data: Data;
  galleryPhotos?: Record<string, EmbedPhoto[]>;
}

export default function PuckRenderer({ data, galleryPhotos }: PuckRendererProps) {
  return <Render config={puckConfig} data={data} metadata={{ galleryPhotos: galleryPhotos ?? {} }} />;
}
