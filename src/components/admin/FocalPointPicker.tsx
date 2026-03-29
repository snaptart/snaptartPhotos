"use client";

import { useRef } from "react";

interface FocalPointPickerProps {
  imageUrl: string;
  focalX: number;
  focalY: number;
  onChange: (x: number, y: number) => void;
}

export default function FocalPointPicker({ imageUrl, focalX, focalY, onChange }: FocalPointPickerProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  function handlePointer(e: React.MouseEvent<HTMLDivElement>) {
    const rect = containerRef.current!.getBoundingClientRect();
    const x = Math.round(Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100)));
    const y = Math.round(Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100)));
    onChange(x, y);
  }

  return (
    <div className="space-y-1.5">
      <p className="text-xs text-neutral-500">Click image to set focal point</p>
      <div
        ref={containerRef}
        className="relative aspect-video cursor-crosshair overflow-hidden rounded border border-neutral-200"
        onClick={handlePointer}
      >
        <img
          src={imageUrl}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
          style={{ objectPosition: `${focalX}% ${focalY}%` }}
          draggable={false}
        />
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute top-0 bottom-0 w-px bg-white/60" style={{ left: `${focalX}%` }} />
          <div className="absolute left-0 right-0 h-px bg-white/60" style={{ top: `${focalY}%` }} />
          <div
            className="absolute h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow"
            style={{ left: `${focalX}%`, top: `${focalY}%`, backgroundColor: "rgba(255,255,255,0.35)" }}
          />
        </div>
      </div>
      <p className="text-xs text-neutral-400 tabular-nums">{focalX}% / {focalY}%</p>
    </div>
  );
}
