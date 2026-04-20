"use client";

import type { FontRoleKey, FontRoleStyle, ThemeSettings } from "@/lib/theme/types";
import { getFontFallback } from "@/lib/theme/fonts";

function roleStyle(theme: ThemeSettings, key: FontRoleKey): FontRoleStyle {
  return theme.fontStyles?.[key] ?? {};
}

function roleCss(
  theme: ThemeSettings,
  key: FontRoleKey,
  family: string,
  defaultSize: number,
): React.CSSProperties {
  const s = roleStyle(theme, key);
  return {
    fontFamily: getFontFallback(family),
    fontWeight: s.weight ?? 400,
    fontStyle: s.italic ? "italic" : "normal",
    textTransform: s.uppercase ? "uppercase" : "none",
    fontSize: s.size ?? defaultSize,
  };
}

// A trimmed-down replica of the real /hall view. Shows rooms with labels and
// titles using the active theme so the weight/italic/caps/size knobs are
// visible in the preview.
export default function HallPreview({ theme }: { theme: ThemeSettings }) {
  const rooms = [
    { title: "Paris", works: 8, offset: { left: 8, top: 22, w: 26, h: 22 } },
    { title: "Provence", works: 12, offset: { left: 38, top: 30, w: 30, h: 28 } },
    { title: "Coastal", works: 5, offset: { left: 72, top: 24, w: 20, h: 20 } },
    { title: "Interiors", works: 9, offset: { left: 22, top: 62, w: 22, h: 24 } },
    { title: "Street", works: 6, offset: { left: 54, top: 66, w: 26, h: 22 } },
  ];

  const labelStyle = roleCss(theme, "labels", theme.fontLabels, 8);
  const headingStyle = roleCss(theme, "headings", theme.fontHeadings, 11);
  const titleStyle = roleCss(theme, "headings", theme.fontHeadings, 16);

  return (
    <div className="overflow-hidden rounded-lg border border-neutral-300 shadow-sm">
      <div
        className="relative"
        style={{
          background: "#fff",
          aspectRatio: "4 / 3",
          color: theme.colorText,
        }}
      >
        {/* Outer frame + hatching */}
        <svg
          width="100%"
          height="100%"
          style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
        >
          <rect
            x={4}
            y={4}
            width="calc(100% - 8px)"
            height="calc(100% - 8px)"
            fill="none"
            stroke="#c9c4bb"
            strokeWidth={1}
          />
          <rect
            x={10}
            y={10}
            width="calc(100% - 20px)"
            height="calc(100% - 20px)"
            fill="none"
            stroke="#c9c4bb"
            strokeWidth={0.5}
            opacity={0.6}
          />
        </svg>

        {/* Title block */}
        <div style={{ position: "absolute", top: 16, left: 20, pointerEvents: "none" }}>
          <div style={{ ...labelStyle, letterSpacing: "2px", color: "#6b6258" }}>
            Plan View · 1:1
          </div>
          <div style={{ ...titleStyle, color: "#2a2620", marginTop: 4 }}>
            The Quiet Wing
          </div>
        </div>

        {/* Rooms */}
        {rooms.map((r) => (
          <div
            key={r.title}
            style={{
              position: "absolute",
              left: `${r.offset.left}%`,
              top: `${r.offset.top}%`,
              width: `${r.offset.w}%`,
              height: `${r.offset.h}%`,
              background: "#fafaf8",
              border: "1px solid #c9c4bb",
              borderRadius: 3,
              boxShadow: "0 1px 2px rgba(30,25,20,0.03)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "flex-end",
              padding: "4px 6px",
            }}
          >
            <div style={{ ...headingStyle, color: "#2a2620", lineHeight: 1 }}>
              {r.title}
            </div>
            <div
              style={{
                ...labelStyle,
                letterSpacing: "1px",
                color: "#6b6258",
                marginTop: 2,
              }}
            >
              {r.works} works
            </div>
          </div>
        ))}

        {/* Scale bar */}
        <div
          style={{
            position: "absolute",
            bottom: 16,
            left: 20,
            display: "flex",
            alignItems: "center",
            gap: 8,
            ...labelStyle,
            letterSpacing: "1px",
            color: "#6b6258",
            pointerEvents: "none",
          }}
        >
          <div style={{ width: 36, height: 1, background: "#6b6258" }} />
          <span>5 galleries · 40 photos</span>
        </div>
      </div>
    </div>
  );
}
