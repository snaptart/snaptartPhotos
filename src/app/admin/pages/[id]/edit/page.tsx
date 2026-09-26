"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Puck } from "@puckeditor/core";
import type { Data } from "@puckeditor/core";
import { useEditorConfig } from "@/lib/puck/use-block-defaults";
import PuckThemeStyles from "@/components/admin/PuckThemeStyles";
import { puckOverrides } from "@/components/puck/overrides";
import { useEditorSave } from "@/components/puck/useEditorSave";
import type { EditorPageInfo } from "@/lib/puck/config";
import type { PageWidth } from "@/lib/page-layout";
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
  isFullBleed: boolean;
  showTitle: boolean;
  metaTitle: string | null;
  metaDescription: string | null;
}

/**
 * The page's content with Page settings → Width matching its Full bleed
 * setting (Pages list), which the site goes by. Saving sends Width back.
 */
function withPageWidth(page: PageRecord): Data {
  const data = page.content && "root" in page.content ? (page.content as Data) : EMPTY_DATA;
  const props = (data.root.props ?? {}) as { width?: PageWidth };
  const width: PageWidth = page.isFullBleed ? "full" : props.width === "reading" ? "reading" : "standard";
  if (props.width === width) return data;
  return { ...data, root: { ...data.root, props: { ...props, width } as Data["root"]["props"] } };
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

  // The homepage starts flush under the header when it opens with a Hero Slideshow.
  const [homepageId, setHomepageId] = useState<string | null>(null);
  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((s) => setHomepageId(s?.homepageId ?? null))
      .catch(() => {});
  }, []);

  const pageId = page?.id;
  const save = useCallback(
    (data: Data) =>
      fetch("/api/pages", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        // Width → Full width is the page's Full bleed setting.
        body: JSON.stringify({ id: pageId, content: data, isFullBleed: (data.root.props as { width?: PageWidth } | undefined)?.width === "full" }),
      }),
    [pageId],
  );
  const editor = useEditorSave(save);
  // New blocks start with the site’s block defaults (Settings → Block defaults).
  const config = useEditorConfig();
  const { begin } = editor;
  const initialData = useMemo(() => (page ? withPageWidth(page) : null), [page]);

  // What was loaded is the starting point for "unpublished changes".
  useEffect(() => {
    if (initialData && config) begin(initialData);
  }, [initialData, config, begin]);

  if (!config || loading) {
    return (
      <div className="flex h-64 items-center justify-center text-neutral-500">
        Loading editor...
      </div>
    );
  }

  if (!page || !initialData) {
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

  const pageInfo: EditorPageInfo = { title: page.title, showTitle: page.showTitle, isHome: page.id === homepageId };

  // -m-8 cancels the <main> p-8 padding so Puck fills the content area
  return (
    <div className="-m-8">
      <PuckThemeStyles />
      <Puck
        config={config}
        data={initialData}
        metadata={{ page: pageInfo }}
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
