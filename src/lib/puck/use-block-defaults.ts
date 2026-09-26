"use client";

import { useEffect, useState } from "react";
import type { Config } from "@puckeditor/core";
import { puckConfig } from "@/lib/puck/config";
import type { BlockDefaults, BlockDefaultsPast } from "@/lib/puck/block-defaults";

type Components = Config["components"];

/** A block's built-in default settings, from the Puck config. */
export function builtInDefaults(type: string): Record<string, unknown> {
  return ((puckConfig.components as Components)[type]?.defaultProps ?? {}) as Record<string, unknown>;
}

/** The Puck config with the site's block defaults laid over each block's built-in ones. */
export function withBlockDefaults(defaults: BlockDefaults): Config {
  const components = { ...(puckConfig.components as Components) };
  for (const [type, values] of Object.entries(defaults)) {
    const c = components[type];
    if (c) components[type] = { ...c, defaultProps: { ...(c.defaultProps ?? {}), ...values } };
  }
  return { ...(puckConfig as Config), components };
}

export type BlockDefaultsState = {
  defaults: BlockDefaults;
  past: BlockDefaultsPast;
  themeName: string | null;
};

export async function fetchBlockDefaults(): Promise<BlockDefaultsState> {
  try {
    const res = await fetch("/api/block-defaults", { cache: "no-store" });
    if (!res.ok) throw new Error(String(res.status));
    const data = await res.json();
    return { defaults: data.defaults ?? {}, past: data.past ?? {}, themeName: data.themeName ?? null };
  } catch {
    return { defaults: {}, past: {}, themeName: null };
  }
}

/**
 * The editor's Puck config: new blocks start with the site's block defaults.
 * null while they load (a few ms; the editors wait for their page anyway).
 */
export function useEditorConfig(): Config | null {
  const [config, setConfig] = useState<Config | null>(null);
  useEffect(() => {
    let cancelled = false;
    fetchBlockDefaults().then(({ defaults }) => {
      if (!cancelled) setConfig(withBlockDefaults(defaults));
    });
    return () => {
      cancelled = true;
    };
  }, []);
  return config;
}
