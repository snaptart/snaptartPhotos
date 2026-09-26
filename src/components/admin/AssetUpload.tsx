"use client";

import { useRef, useState, type ReactNode } from "react";
import { Button } from "@/components/admin/ui";

interface AssetUploadProps {
  value: string;
  onChange: (url: string) => void;
  /** File types the picker offers, e.g. "image/png,image/svg+xml". */
  accept?: string;
  /** Renders the current image; defaults to a small contained preview. */
  preview?: (url: string) => ReactNode;
  /** Called with the uploaded image's size, for "should be square"-type warnings. */
  onDimensions?: (width: number | null, height: number | null) => void;
  /** Extra controls beside Upload (e.g. "Choose from library"). */
  children?: ReactNode;
}

/** Uploads one site asset (icon, share image) to Blob storage via /api/upload?kind=asset. */
export default function AssetUpload({ value, onChange, accept = "image/*", preview, onDimensions, children }: AssetUploadProps) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function upload(file: File) {
    setBusy(true);
    setError(null);
    const form = new FormData();
    form.append("file", file);
    form.append("kind", "asset");
    form.append("folder", "site");
    const res = await fetch("/api/upload", { method: "POST", body: form });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data.url) {
      onChange(data.url);
      onDimensions?.(data.width ?? null, data.height ?? null);
    } else {
      setError(data.error || "Upload failed.");
    }
    setBusy(false);
  }

  return (
    <div className="flex items-start gap-3">
      {value && (preview ? preview(value) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={value} alt="" className="h-12 w-12 shrink-0 rounded-md border border-admin-border bg-white object-contain p-1" />
      ))}
      <div className="flex flex-col gap-1.5">
        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" disabled={busy} onClick={() => input.current?.click()}>
            {busy ? "Uploading..." : value ? "Replace" : "Upload"}
          </Button>
          {children}
          {value && !busy && (
            <Button type="button" size="sm" kind="subtle" onClick={() => onChange("")}>
              Remove
            </Button>
          )}
        </div>
        {error && <p className="text-[12px] text-admin-danger">{error}</p>}
      </div>
      <input
        ref={input}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file) upload(file);
        }}
      />
    </div>
  );
}
