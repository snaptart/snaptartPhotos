"use client";

import { useEffect, useState, useCallback } from "react";
import { Puck } from "@puckeditor/core";
import type { Data } from "@puckeditor/core";
import { puckConfig } from "@/lib/puck/config";
import PuckThemeStyles from "@/components/admin/PuckThemeStyles";
import { puckOverrides } from "@/components/puck/overrides";
import { useEditorSave } from "@/components/puck/useEditorSave";
import { STORIES_INDEX_DEFAULTS } from "@/components/public/stories/StoriesIndex";
import "@puckeditor/core/puck.css";

const SEEDED_DATA: Data = {
  root: { props: {} },
  content: [
    {
      type: "StoriesIndexBlock",
      props: {
        id: "StoriesIndexBlock-seed",
        volumeLabel: STORIES_INDEX_DEFAULTS.volumeLabel,
        title: STORIES_INDEX_DEFAULTS.title,
        dek: STORIES_INDEX_DEFAULTS.dek,
      },
    },
  ],
  zones: {},
};

export default function StoriesIndexEditorPage() {
  const [initialData, setInitialData] = useState<Data | null>(null);

  const fetchDoc = useCallback(async () => {
    const res = await fetch("/api/stories-index");
    const row = await res.json();
    const content = row?.content;
    if (content && typeof content === "object" && "root" in content && "content" in content) {
      setInitialData(content as Data);
    } else {
      setInitialData(SEEDED_DATA);
    }
  }, []);

  useEffect(() => {
    fetchDoc();
  }, [fetchDoc]);

  const save = useCallback(
    (data: Data) =>
      fetch("/api/stories-index", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: data }),
      }),
    [],
  );
  const editor = useEditorSave(save);
  const { begin } = editor;

  // What was loaded is the starting point for "unpublished changes".
  useEffect(() => {
    if (initialData) begin(initialData);
  }, [initialData, begin]);

  if (!initialData) {
    return (
      <div className="flex h-64 items-center justify-center text-neutral-500">
        Loading editor...
      </div>
    );
  }

  return (
    <div className="-m-8">
      <PuckThemeStyles />
      <Puck
        config={puckConfig}
        data={initialData}
        onPublish={editor.onPublish}
        onChange={editor.onChange}
        headerTitle="Stories — Contents page"
        headerPath="/stories"
        overrides={puckOverrides}
      />
      {editor.statusEl}
    </div>
  );
}
