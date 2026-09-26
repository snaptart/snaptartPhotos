"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Puck, useGetPuck, type ComponentData, type Config, type Data, type Fields } from "@puckeditor/core";
import PuckThemeStyles from "@/components/admin/PuckThemeStyles";
import { puckOverrides } from "@/components/puck/overrides";
import { useEditorSave, type EditorSaveWords } from "@/components/puck/useEditorSave";
import {
  DEFAULTS_GROUPS,
  DEFAULTS_TYPES,
  diffFromBuiltIn,
  isDefaultable,
  type BlockDefaults,
} from "@/lib/puck/block-defaults";
import { builtInDefaults, fetchBlockDefaults, withBlockDefaults } from "@/lib/puck/use-block-defaults";
import type { LibraryPhoto, PhotoRef } from "@/lib/puck/photo-ref";
import "@puckeditor/core/puck.css";

/*
 * Block defaults: a locked sample page with one of each block. Change a block's settings and
 * save — new blocks of that kind start that way. Only settings are shown here; a block's words,
 * photos and links stay per block, so the sample keeps its built-in placeholder content.
 */

const WORDS: EditorSaveWords = {
  pending: "Unsaved changes",
  saving: "Saving…",
  saved: "Saved",
  failed: "Couldn't save. Your changes are still here — try again.",
  leave: "You have block defaults that aren't saved yet. Leave and lose them?",
};

const SAMPLE_TEXT = (text: string) => ({
  content: { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text }] }] },
});

/** Placeholder blocks inside the layout blocks, so their spacing shows. Not saved anywhere. */
function sampleZones(): Data["zones"] {
  const rich = (id: string, text: string): ComponentData => ({ type: "RichText", props: { id, ...SAMPLE_TEXT(text) } });
  return {
    "Container-sample:container-content": [rich("RichText-sample-c", "Text inside a Container.")],
    "Rows-sample:rows": [rich("RichText-sample-r1", "First row."), rich("RichText-sample-r2", "Second row.")],
    "Columns-sample:column-0": [rich("RichText-sample-k0", "First column.")],
    "Columns-sample:column-1": [rich("RichText-sample-k1", "Second column.")],
    "Columns-sample:column-2": [rich("RichText-sample-k2", "Third column.")],
    "Columns-sample:column-3": [rich("RichText-sample-k3", "Fourth column.")],
  };
}

/** A few library photos for the photo blocks, so the sample looks like a real page. Best effort. */
async function fetchSamplePhotos(): Promise<PhotoRef[]> {
  try {
    const galleries: { id: string }[] = await (await fetch("/api/galleries")).json();
    for (const g of galleries.slice(0, 5)) {
      const photos: LibraryPhoto[] = await (await fetch(`/api/photos?galleryId=${g.id}`)).json();
      if (!photos.length) continue;
      return photos.slice(0, 3).map((ph, i) => ({
        id: `sample-photo-${i}`,
        photoId: ph.id,
        url: ph.url,
        thumbnailUrl: ph.thumbnailUrl,
        title: ph.title ?? "",
        width: ph.width,
        height: ph.height,
        focalX: ph.focalX ?? 50,
        focalY: ph.focalY ?? 50,
        description: ph.description,
        location: ph.location,
        cameraSettings: ph.cameraSettings,
      }));
    }
  } catch {
    // No photos: the photo blocks show their empty state
  }
  return [];
}

function sampleData(defaults: BlockDefaults, photos: PhotoRef[]): Data {
  // Content props only (never saved as defaults).
  const content: Record<string, Record<string, unknown>> = photos.length
    ? { PhotoPlate: { photo: photos[0] }, SelectedWork: { photos } }
    : {};
  return {
    root: { props: {} },
    content: DEFAULTS_TYPES.map((type) => ({
      type,
      props: { ...builtInDefaults(type), ...(defaults[type] ?? {}), ...(content[type] ?? {}), id: `${type}-sample` },
    })),
    zones: sampleZones(),
  };
}

/** Only a block's settings: its content fields are hidden (they aren't defaults). */
function settingsOnly(type: string, fields: Fields): Fields {
  return Object.fromEntries(Object.entries(fields).filter(([k]) => isDefaultable(type, k))) as Fields;
}

function sampleConfig(defaults: BlockDefaults): Config {
  const base = withBlockDefaults(defaults);
  const components: Config["components"] = {};
  for (const type of DEFAULTS_TYPES) {
    const c = base.components[type];
    if (!c) continue;
    const resolveFields = c.resolveFields;
    components[type] = {
      ...c,
      fields: settingsOnly(type, (c.fields ?? {}) as Fields),
      ...(resolveFields && {
        resolveFields: async (...args: Parameters<NonNullable<typeof resolveFields>>) =>
          settingsOnly(type, (await resolveFields(...args)) as Fields),
      }),
    };
  }
  // The placeholder text inside the layout blocks: shown, not editable.
  components.RichText = { ...base.components.RichText, fields: {} };
  return {
    ...base,
    // No page-level fields: the sample page itself isn't saved.
    root: { fields: {} },
    components,
    categories: Object.fromEntries(DEFAULTS_GROUPS.map((g) => [g.title, { title: g.title, components: g.types }])),
  };
}

/** The sample page as saved defaults: each block's settings that differ from the built-in ones. */
function defaultsFromData(data: Data): BlockDefaults {
  const out: BlockDefaults = {};
  for (const block of data.content ?? []) {
    const type = block.type as string;
    if (!DEFAULTS_TYPES.includes(type) || out[type]) continue;
    const diff = diffFromBuiltIn(type, block.props as Record<string, unknown>, builtInDefaults(type));
    if (Object.keys(diff).length) out[type] = diff;
  }
  return out;
}

export default function BlockDefaultsEditorPage() {
  const [loaded, setLoaded] = useState<{ defaults: BlockDefaults; themeName: string | null; photos: PhotoRef[] } | null>(
    null,
  );
  const [changedTypes, setChangedTypes] = useState<string[] | null>(null);

  useEffect(() => {
    Promise.all([fetchBlockDefaults(), fetchSamplePhotos()]).then(([{ defaults, themeName }, photos]) =>
      setLoaded({ defaults, themeName, photos }),
    );
  }, []);

  const save = useCallback(async (data: Data) => {
    const defaults = defaultsFromData(data);
    const res = await fetch("/api/block-defaults", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ defaults }),
    });
    if (res.ok) {
      const { previous = {} } = await res.clone().json();
      const changed = DEFAULTS_TYPES.filter(
        (t) => JSON.stringify(previous[t] ?? {}) !== JSON.stringify(defaults[t] ?? {}),
      );
      setChangedTypes(changed);
    }
    return res;
  }, []);
  const editor = useEditorSave(save, WORDS);
  const { begin } = editor;

  const config = useMemo(() => (loaded ? sampleConfig(loaded.defaults) : null), [loaded]);
  const data = useMemo(() => (loaded ? sampleData(loaded.defaults, loaded.photos) : null), [loaded]);

  useEffect(() => {
    if (data) begin(data);
  }, [data, begin]);

  const overrides = useMemo(() => {
    // No "Copy to page" here, and a Save button in place of Publish.
    const { actionBar: _copy, ...rest } = puckOverrides;
    void _copy;
    return {
      ...rest,
      drawer: () => (
        <p className="px-4 py-3 text-[12px] leading-relaxed text-neutral-500">
          Click a block in the sample page to change the settings new blocks of that kind start with. Words, photos
          and links stay per block, so they aren&apos;t here.
        </p>
      ),
      headerActions: () => <SaveButton onSave={editor.onPublish} saving={editor.status === "saving"} />,
    };
  }, [editor.onPublish, editor.status]);

  if (!config || !data) {
    return <div className="flex h-64 items-center justify-center text-neutral-500">Loading block defaults...</div>;
  }

  return (
    <div className="-m-8">
      <PuckThemeStyles />
      <Puck
        config={config}
        data={data}
        onChange={editor.onChange}
        onPublish={editor.onPublish}
        headerTitle={`Block defaults${loaded?.themeName ? ` · ${loaded.themeName}` : ""}`}
        overrides={overrides}
        permissions={{ drag: false, duplicate: false, delete: false, insert: false }}
      />
      {changedTypes && (
        <div className="fixed bottom-4 left-1/2 z-50 flex max-w-[92vw] -translate-x-1/2 items-center gap-4 rounded-lg bg-neutral-900 px-4 py-3 font-sans text-[13px] text-white shadow-lg">
          <span>
            {changedTypes.length
              ? "Saved. New blocks start this way; blocks already on pages are unchanged."
              : "Saved. Nothing changed."}
          </span>
          {changedTypes.length > 0 && (
            <Link
              href={`/admin/settings/blocks?block=${changedTypes[0]}`}
              className="whitespace-nowrap rounded bg-white px-3 py-1 font-medium text-neutral-900 hover:bg-neutral-200"
            >
              Apply to existing blocks…
            </Link>
          )}
          <button type="button" onClick={() => setChangedTypes(null)} className="text-white/70 hover:text-white" aria-label="Dismiss">
            ×
          </button>
        </div>
      )}
      {!changedTypes && editor.statusEl}
    </div>
  );
}

function SaveButton({ onSave, saving }: { onSave: (data: Data) => void; saving: boolean }) {
  const getPuck = useGetPuck();
  return (
    <div className="flex items-center gap-2">
      <Link href="/admin/settings/blocks" className="text-[13px] text-neutral-500 hover:text-neutral-900">
        Settings → Block defaults
      </Link>
      <button
        type="button"
        disabled={saving}
        onClick={() => onSave(getPuck().appState.data as Data)}
        className="rounded-md bg-neutral-900 px-3.5 py-2 text-[13px] font-medium text-white hover:bg-neutral-700 disabled:opacity-50"
      >
        {saving ? "Saving…" : "Save defaults"}
      </button>
    </div>
  );
}
