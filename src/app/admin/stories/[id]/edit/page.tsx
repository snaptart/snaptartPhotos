"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Puck } from "@puckeditor/core";
import type { Data } from "@puckeditor/core";
import { puckConfig } from "@/lib/puck/config";
import PuckThemeStyles from "@/components/admin/PuckThemeStyles";
import { puckOverrides } from "@/components/puck/overrides";
import { useEditorSave } from "@/components/puck/useEditorSave";
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

  const storyId = story?.id;
  const save = useCallback(
    (data: Data) =>
      fetch("/api/stories", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: storyId, content: data }),
      }),
    [storyId],
  );
  const editor = useEditorSave(save);
  const { begin } = editor;

  // What was loaded is the starting point for "unpublished changes".
  useEffect(() => {
    if (story) begin(story.content && "root" in story.content ? (story.content as Data) : EMPTY_DATA);
  }, [story, begin]);

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
      <PuckThemeStyles />
      <Puck
        config={puckConfig}
        data={initialData}
        onPublish={editor.onPublish}
        onChange={editor.onChange}
        headerTitle={story.title}
        headerPath={`/stories/${story.slug}`}
        overrides={puckOverrides}
      />
      {editor.statusEl}
    </div>
  );
}
