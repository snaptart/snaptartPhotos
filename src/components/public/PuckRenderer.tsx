"use client";

import { Render } from "@puckeditor/core";
import type { Data } from "@puckeditor/core";
import { puckConfig } from "@/lib/puck/config";

interface PuckRendererProps {
  data: Data;
}

export default function PuckRenderer({ data }: PuckRendererProps) {
  return <Render config={puckConfig} data={data} />;
}
