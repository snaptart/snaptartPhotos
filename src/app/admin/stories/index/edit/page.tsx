"use client";

import { useEffect, useState, useCallback } from "react";
import { Puck } from "@puckeditor/core";
import type { Data } from "@puckeditor/core";
import { puckConfig } from "@/lib/puck/config";
import { draggableOutlinePlugin } from "@/components/puck/DraggableOutline";
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
  const [saving, setSaving] = useState(false);

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

  const handleSave = async (data: Data) => {
    setSaving(true);
    try {
      await fetch("/api/stories-index", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: data }),
      });
    } finally {
      setSaving(false);
    }
  };

  if (!initialData) {
    return (
      <div className="flex h-64 items-center justify-center text-neutral-500">
        Loading editor...
      </div>
    );
  }

  return (
    <div className="-m-8">
      <Puck
        config={puckConfig}
        data={initialData}
        onPublish={handleSave}
        headerTitle="Stories — Contents page"
        headerPath="/stories"
        overrides={draggableOutlinePlugin().overrides}
      />
      {saving && (
        <div className="fixed bottom-4 right-4 z-50 rounded bg-neutral-900 px-4 py-2 text-sm text-white shadow-lg">
          Saving...
        </div>
      )}
    </div>
  );
}
