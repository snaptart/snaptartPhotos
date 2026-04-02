"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Puck } from "@puckeditor/core";
import type { Data } from "@puckeditor/core";
import { puckConfig } from "@/lib/puck/config";
import "@puckeditor/core/puck.css";

const EMPTY_DATA: Data = {
  root: { props: {} },
  content: [],
  zones: {},
};

interface StoryRecord {
  id: string;
  title: string;
  slug: string;
  content: Data | null;
  isPublished: boolean;
  metaTitle: string | null;
  metaDescription: string | null;
}

export default function StoryEditorPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [story, setStory] = useState<StoryRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchStory = useCallback(async () => {
    const res = await fetch("/api/stories");
    const stories: StoryRecord[] = await res.json();
    const found = stories.find((s) => s.id === id);
    if (found) {
      setStory(found);
    }
    setLoading(false);
  }, [id]);

  useEffect(() => {
    fetchStory();
  }, [fetchStory]);

  const handleSave = async (data: Data) => {
    if (!story) return;
    setSaving(true);
    try {
      await fetch("/api/stories", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: story.id,
          content: data,
        }),
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center text-neutral-500">
        Loading editor...
      </div>
    );
  }

  if (!story) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-4">
        <p className="text-neutral-500">Story not found</p>
        <button
          onClick={() => router.push("/admin/stories")}
          className="rounded bg-neutral-900 px-4 py-2 text-sm text-white hover:bg-neutral-700"
        >
          Back to Stories
        </button>
      </div>
    );
  }

  const initialData: Data =
    story.content && "root" in story.content
      ? (story.content as Data)
      : EMPTY_DATA;

  return (
    <div className="-m-8">
      <Puck
        config={puckConfig}
        data={initialData}
        onPublish={handleSave}
        headerTitle={story.title}
        headerPath={`/stories/${story.slug}`}
      />
      {saving && (
        <div className="fixed bottom-4 right-4 z-50 rounded bg-neutral-900 px-4 py-2 text-sm text-white shadow-lg">
          Saving...
        </div>
      )}
    </div>
  );
}
