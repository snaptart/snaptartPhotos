"use client";

import Image from "next/image";
import { useMemo } from "react";
import { handwritingFontStack, stampFontStack } from "./slideFonts";
import "./slide.css";

export interface SlidePhoto {
  id: string;
  url: string;
  thumbnailUrl?: string;
  title: string | null;
  width: number;
  height: number;
  takenAt?: Date | string | null;
}

interface SlideProps {
  photo: SlidePhoto;
  tilt?: number;
  frameNumber?: string | null;
  filmStamp?: string | null;
  handwritingFont?: string | null;
  stampFont?: string | null;
  onClick?: () => void;
  priority?: boolean;
  sizes?: string;
  useThumbnail?: boolean;
}

const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

function formatDateStamp(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  const m = MONTHS[d.getMonth()];
  const y = String(d.getFullYear() % 100).padStart(2, "0");
  return `${m} '${y}`;
}

export default function Slide({
  photo,
  tilt = 0,
  frameNumber,
  filmStamp,
  handwritingFont,
  stampFont,
  onClick,
  priority = false,
  sizes = "320px",
  useThumbnail = true,
}: SlideProps) {
  const isPortrait = photo.height > photo.width;
  const dateStamp = formatDateStamp(photo.takenAt);
  const caption = photo.title ?? "";

  const rootStyle = useMemo<React.CSSProperties>(
    () => ({
      "--slide-tilt": `${tilt}deg`,
      "--slide-handwriting-font": handwritingFontStack(handwritingFont),
      "--slide-stamp-font": stampFontStack(stampFont),
    }) as React.CSSProperties,
    [tilt, handwritingFont, stampFont],
  );

  const imgSrc = useThumbnail && photo.thumbnailUrl ? photo.thumbnailUrl : photo.url;

  return (
    <div
      className={"slide-root" + (onClick ? " slide-clickable" : "")}
      data-portrait={isPortrait ? "true" : undefined}
      style={rootStyle}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onClick(); } } : undefined}
    >
      <div className="slide-mount">
        {/* Aperture bevel */}
        <div className="slide-aperture-bevel" />

        {/* Aperture with photo */}
        <div className="slide-aperture">
          <div className={"slide-film" + (isPortrait ? " slide-film-rotated" : "")}>
            <Image
              src={imgSrc}
              alt={photo.title ?? ""}
              fill
              sizes={sizes}
              priority={priority}
              className="slide-photo-img"
            />
          </div>
          {/* Warm vignette + subtle grade */}
          <div className="slide-photo-vignette" aria-hidden />
        </div>

        {/* Top stamp row (film type + date) */}
        {(filmStamp || dateStamp) && (
          <div className="slide-stamp-top">
            <span className="slide-stamp">{filmStamp ?? ""}</span>
            <span className="slide-date">{dateStamp ?? ""}</span>
          </div>
        )}

        {/* Bottom handwritten caption */}
        {caption && <div className="slide-caption">{caption}</div>}

        {/* Corner frame number */}
        {frameNumber && <div className="slide-corner-stamp">{frameNumber}</div>}
      </div>
    </div>
  );
}

/**
 * Derives a frame number like "01A", "02B"... from a position index.
 * Cycles letters A–F every 6 items.
 */
export function deriveFrameNumber(position: number): string {
  const letters = "ABCDEF";
  const n = String(position + 1).padStart(2, "0");
  return `${n}${letters[position % letters.length]}`;
}
