"use client";

import { useEffect, useState } from "react";
import {
  ROLE_FAMILY_FIELDS,
  TEXT_STYLE_DEFAULTS,
  type FontRoleKey,
  type TextStyleKey,
  type ThemeSettings,
} from "@/lib/theme/types";
import { getFontFallback } from "@/lib/theme/fonts";
import { DEFAULT_LIGHTBOX_SETTINGS, type LightboxSettings } from "@/components/public/Lightbox";

/** A text style's typeface, weight, slant and case, at the preview's own size. */
function textCss(theme: ThemeSettings, key: TextStyleKey, size: number): React.CSSProperties {
  const style = { ...TEXT_STYLE_DEFAULTS[key], ...(theme.textStyles?.[key] ?? {}) };
  const role = theme.fontStyles?.[style.role] ?? {};
  return {
    fontFamily: getFontFallback(String(theme[ROLE_FAMILY_FIELDS[style.role]])),
    fontWeight: style.weight ?? role.weight ?? 400,
    fontStyle: (style.italic ?? role.italic) ? "italic" : "normal",
    textTransform: (style.uppercase ?? role.uppercase) ? "uppercase" : "none",
    fontSize: size,
    lineHeight: 1.15,
  };
}

function fontCss(theme: ThemeSettings, role: FontRoleKey): React.CSSProperties {
  return { fontFamily: getFontFallback(String(theme[ROLE_FAMILY_FIELDS[role]])) };
}

const mix = (a: string, pct: number, b: string) => `color-mix(in srgb, ${a} ${pct}%, ${b})`;
const FADE_MS = { none: 0, fast: 150, medium: 300, slow: 500 } as const;

/** Sample details, one per option in "Metadata shown". */
const SAMPLE = {
  title: "Split Rock Lighthouse",
  description: "The lighthouse from the shore below, just after sunset.",
  location: "Lake Superior, Minnesota",
  date: "September 2020",
  camera: "Nikon Z 6 · 165mm · f/9 · 1/8s · ISO 320",
  filename: "DSC_4357.jpg",
};

/**
 * Mini version of the public lightbox (components/public/Lightbox.tsx): counter
 * and close ring above, the photograph between two arrow rings, the caption
 * under a hairline or over the photo. It follows the lightbox colours and text
 * styles, and the Lightbox settings — pass `settings` while they're being
 * edited; without it, the saved ones are shown.
 */
export default function LightboxPreview({ theme, settings }: { theme: ThemeSettings; settings?: Partial<LightboxSettings> }) {
  const [saved, setSaved] = useState<Partial<LightboxSettings> | null>(null);
  useEffect(() => {
    if (settings) return;
    fetch("/api/settings")
      .then((r) => (r.ok ? r.json() : null))
      .then((s) =>
        s &&
        setSaved({
          metadataFields: s.lightboxMetadataFields ?? undefined,
          cornerRadius: s.lightboxCornerRadius ?? undefined,
          captionPosition: s.lightboxCaptionPosition ?? undefined,
          fadeSpeed: s.lightboxFadeSpeed ?? undefined,
          captionAlignment: s.lightboxCaptionAlignment ?? undefined,
        }),
      )
      .catch(() => {});
  }, [settings]);

  const lb: LightboxSettings = { ...DEFAULT_LIGHTBOX_SETTINGS, ...(saved ?? {}), ...(settings ?? {}) };
  const fields = lb.metadataFields;
  const isOverlay = lb.captionPosition !== "below";

  // Replay the photo's fade whenever the speed changes, so the difference shows.
  const [fadeRun, setFadeRun] = useState(0);
  useEffect(() => setFadeRun((n) => n + 1), [lb.fadeSpeed]);
  const fadeMs = FADE_MS[lb.fadeSpeed] ?? 300;

  const bg = theme.colorLightboxBg || "#14130F";
  const text = theme.colorLightboxText || "#FBFAF8";
  const muted = mix(text, 62, bg);
  const ring = mix(text, 22, bg);
  const rule = mix(text, 12, bg);
  const body = fontCss(theme, "body");

  const place = [fields.includes("location") && SAMPLE.location, fields.includes("date") && SAMPLE.date].filter(Boolean).join(" · ");
  const hasCaption = ["title", "description", "location", "date", "camera", "filename"].some((f) => fields.includes(f));

  const caption = hasCaption ? (
    <div style={{ textAlign: lb.captionAlignment }}>
      {fields.includes("title") && <div style={{ ...textCss(theme, "collectionTitle", 14), color: text }}>{SAMPLE.title}</div>}
      {fields.includes("description") && (
        <div style={{ ...body, fontSize: 7, lineHeight: 1.4, color: mix(text, 82, bg), marginTop: 3 }}>{SAMPLE.description}</div>
      )}
      {place && (
        <div style={{ ...textCss(theme, "meta", 6.5), letterSpacing: "0.14em", color: muted, marginTop: 4 }}>{place}</div>
      )}
      {fields.includes("camera") && (
        <div style={{ ...body, fontSize: 7, letterSpacing: "0.04em", color: muted, marginTop: 4 }}>{SAMPLE.camera}</div>
      )}
      {fields.includes("filename") && (
        <div style={{ ...body, fontSize: 7, letterSpacing: "0.04em", color: muted, marginTop: 3 }}>{SAMPLE.filename}</div>
      )}
    </div>
  ) : null;

  const roundButton = (size: number): React.CSSProperties => ({
    width: size,
    height: size,
    borderRadius: "50%",
    border: `1px solid ${ring}`,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  });
  // The preview is roughly a third of real size; corners scale with it.
  const radius = Math.round((lb.cornerRadius ?? 0) * 0.35 * 10) / 10;

  return (
    <div className="overflow-hidden rounded-lg border border-neutral-300 shadow-sm">
      <style>{`@keyframes lb-preview-fade { from { opacity: 0 } to { opacity: 1 } }`}</style>
      <div className="relative flex flex-col" style={{ aspectRatio: "4 / 3", background: bg, color: text }}>
        <div className="flex items-center justify-between" style={{ padding: "10px 12px 0" }}>
          <span style={{ ...body, fontSize: 8, letterSpacing: "0.16em", color: muted }}>
            02 / 12&nbsp;&nbsp;&middot;&nbsp;&nbsp;North Shore
          </span>
          <span style={roundButton(18)} aria-hidden="true">
            <svg width="6" height="6" viewBox="0 0 16 16" fill="none" stroke={text} strokeWidth="1.6" strokeLinecap="round">
              <path d="M1 1l14 14M15 1L1 15" />
            </svg>
          </span>
        </div>

        <div className="flex flex-1 items-center justify-center" style={{ padding: "8px 44px 0", minHeight: 0 }}>
          <div
            key={fadeRun}
            style={{
              position: "relative",
              width: "100%",
              maxWidth: isOverlay || !hasCaption ? 230 : 200,
              aspectRatio: "3 / 2",
              borderRadius: radius,
              overflow: "hidden",
              background: "linear-gradient(135deg, #c5bfae 0%, #8a8274 50%, #5a554a 100%)",
              animation: fadeMs ? `lb-preview-fade ${fadeMs}ms ease` : undefined,
            }}
          >
            {isOverlay && caption && (
              <div
                style={{
                  position: "absolute",
                  left: 0,
                  right: 0,
                  [lb.captionPosition === "overlay-top" ? "top" : "bottom"]: 0,
                  padding: "8px 10px",
                  background: `linear-gradient(${lb.captionPosition === "overlay-top" ? "to bottom" : "to top"}, rgba(0,0,0,0.75), transparent)`,
                }}
              >
                {caption}
              </div>
            )}
          </div>
        </div>

        {[
          { side: "left" as const, d: "M22 5.5H2M9 1L2 5.5 9 10" },
          { side: "right" as const, d: "M0 5.5h20M13 1l7 4.5-7 4.5" },
        ].map(({ side, d }) => (
          <span key={side} aria-hidden="true" style={{ ...roundButton(22), position: "absolute", top: "46%", [side]: 12 }}>
            <svg width="9" height="5" viewBox="0 0 22 11" fill="none" stroke={text} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <path d={d} />
            </svg>
          </span>
        ))}

        {!isOverlay && caption ? (
          <div style={{ padding: "10px 44px 8px" }}>
            <div style={{ borderTop: `1px solid ${rule}`, paddingTop: 7 }}>{caption}</div>
          </div>
        ) : (
          <div style={{ height: 10 }} />
        )}

        <div
          style={{ ...body, fontSize: 6, letterSpacing: "0.12em", textTransform: "uppercase", textAlign: "center", color: mix(text, 36, bg), paddingBottom: 8 }}
        >
          Esc closes &middot; arrow keys move within the collection
        </div>
      </div>
      {isOverlay && caption && (
        <p className="border-t border-neutral-200 bg-white px-3 py-1.5 font-sans text-[10px] text-neutral-500">
          On the site the caption appears when the pointer is over the photo.
        </p>
      )}
    </div>
  );
}
