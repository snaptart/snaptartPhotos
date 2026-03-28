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
  const [saving, setSaving] = useState(false);

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

  const handleSave = async (data: Data) => {
    if (!page) return;
    setSaving(true);
    try {
      await fetch("/api/pages", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: page.id,
          content: data,
        }),
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center text-neutral-500">
        Loading editor...
      </div>
    );
  }

  if (!page) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4">
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

  // Determine initial data: use saved Puck data or start fresh
  const initialData: Data = page.content && "root" in page.content
    ? (page.content as Data)
    : EMPTY_DATA;

  return (
    <div className="puck-editor-fullscreen">
      <Puck
        config={puckConfig}
        data={initialData}
        onPublish={handleSave}
        headerTitle={page.title}
        headerPath={`/${page.slug}`}
      />
      {saving && (
        <div className="fixed bottom-4 right-4 z-50 rounded bg-neutral-900 px-4 py-2 text-sm text-white shadow-lg">
          Saving...
        </div>
      )}
    </div>
  );
}
