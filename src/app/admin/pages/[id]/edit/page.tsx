"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Puck } from "@puckeditor/core";
import type { Data } from "@puckeditor/core";
import { useEditorConfig } from "@/lib/puck/use-block-defaults";
import PuckThemeStyles from "@/components/admin/PuckThemeStyles";
import { puckOverrides } from "@/components/puck/overrides";
import { useEditorSave } from "@/components/puck/useEditorSave";
import "@puckeditor/core/puck.css";

const EMPTY_DATA: Data = {
  root: { props: {} },
  content: [],
  zones: {},
};

interface PageRecord {
  id: string;
  title: string;
  slug: string;
  content: Data | null;
  pageType: string;
  isPublished: boolean;
  metaTitle: string | null;
  metaDescription: string | null;
}

export default function PuckEditorPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [page, setPage] = useState<PageRecord | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchPage = useCallback(async () => {
    const res = await fetch("/api/pages");
    const pages: PageRecord[] = await res.json();
    const found = pages.find((p) => p.id === id);
    if (found) {
      setPage(found);
    }
    setLoading(false);
  }, [id]);

  useEffect(() => {
    fetchPage();
  }, [fetchPage]);

  const pageId = page?.id;
  const save = useCallback(
    (data: Data) =>
      fetch("/api/pages", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: pageId, content: data }),
      }),
    [pageId],
  );
  const editor = useEditorSave(save);
  // New blocks start with the site’s block defaults (Settings → Block defaults).
  const config = useEditorConfig();
  const { begin } = editor;

  // What was loaded is the starting point for "unpublished changes".
  useEffect(() => {
    if (page && config) begin(page.content && "root" in page.content ? (page.content as Data) : EMPTY_DATA);
  }, [page, config, begin]);

  if (!config || loading) {
    return (
      <div className="flex h-64 items-center justify-center text-neutral-500">
        Loading editor...
      </div>
    );
  }

  if (!page) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-4">
        <p className="text-neutral-500">Page not found</p>
        <button
          onClick={() => router.push("/admin/pages")}
          className="rounded bg-neutral-900 px-4 py-2 text-sm text-white hover:bg-neutral-700"
        >
          Back to Pages
        </button>
      </div>
    );
  }

  const initialData: Data =
    page.content && "root" in page.content
      ? (page.content as Data)
      : EMPTY_DATA;

  // -m-8 cancels the <main> p-8 padding so Puck fills the content area
  return (
    <div className="-m-8">
      <PuckThemeStyles />
      <Puck
        config={config}
        data={initialData}
        onPublish={editor.onPublish}
        onChange={editor.onChange}
        headerTitle={page.title}
        headerPath={`/${page.slug}`}
        overrides={puckOverrides}
      />
      {editor.statusEl}
    </div>
  );
}
