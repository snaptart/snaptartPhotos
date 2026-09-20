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

// Mini version of the Hall expanded-photo lightbox: blurred photo on the left,
// metadata drawer on the right. Theme-driven text elements react to Typography
// settings.
export default function LightboxPreview({ theme }: { theme: ThemeSettings }) {
  const labelStyle = roleCss(theme, "labels", theme.fontLabels, 8);
  const titleStyle = roleCss(theme, "headings", theme.fontHeadings, 18);
  const bodyStyle = roleCss(theme, "body", theme.fontBody, 11);

  return (
    <div className="overflow-hidden rounded-lg border border-neutral-300 shadow-sm">
      <div
        className="relative grid"
        style={{
          gridTemplateColumns: "1fr 140px",
          aspectRatio: "4 / 3",
          background: "rgba(42, 38, 32, 0.85)",
          backdropFilter: "blur(16px)",
        }}
      >
        {/* Photo column */}
        <div
          className="flex items-center justify-center"
          style={{ padding: 16, position: "relative" }}
        >
          <div
            style={{
              width: "80%",
              aspectRatio: "3 / 2",
              padding: 6,
              background: "#fff",
              boxShadow: "0 10px 24px rgba(0,0,0,0.4)",
              position: "relative",
            }}
          >
            <div
              style={{
                position: "absolute",
                inset: 6,
                background:
                  "linear-gradient(135deg, #c5bfae 0%, #8a8274 50%, #5a554a 100%)",
              }}
            />
          </div>

          {/* Prev/next hints at bottom */}
          <div
            style={{
              position: "absolute",
              bottom: 8,
              left: "50%",
              transform: "translateX(-50%)",
              display: "flex",
              gap: 10,
              alignItems: "center",
              ...labelStyle,
              letterSpacing: "2px",
              color: "rgba(255,255,255,0.55)",
              pointerEvents: "none",
            }}
          >
            <span>← / →  Navigate</span>
            <span style={{ opacity: 0.5 }}>·</span>
            <span>02 / 12</span>
          </div>
        </div>

        {/* Drawer */}
        <div
          style={{
            background: "#fff",
            padding: 12,
            display: "flex",
            flexDirection: "column",
            gap: 10,
            color: "#2a2620",
            boxShadow: "0 8px 24px rgba(0,0,0,0.3)",
          }}
        >
          <div>
            <div style={{ ...labelStyle, letterSpacing: "2px", color: "#6b6258" }}>
              Paris · 02 / 12
            </div>
            <div
              style={{
                ...titleStyle,
                color: "#2a2620",
                marginTop: 4,
                lineHeight: 1.1,
              }}
            >
              Sample Title
            </div>
            <div
              style={{
                width: 20,
                height: 1,
                background: theme.colorAccent,
                marginTop: 8,
              }}
            />
          </div>

          <div
            style={{
              ...bodyStyle,
              color: "#6b6258",
              lineHeight: 1.4,
            }}
          >
            “A short italic caption for this image.”
          </div>

          <div>
            <div
              style={{
                ...labelStyle,
                letterSpacing: "2px",
                color: "#6b6258",
                marginBottom: 4,
              }}
            >
              Where · Paris
            </div>
            <div
              style={{
                height: 28,
                border: "1px solid #c9c4bb",
                background: "#f0ebdd",
                position: "relative",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  left: "50%",
                  top: "50%",
                  transform: "translate(-50%, -100%)",
                  width: 6,
                  height: 8,
                  background: theme.colorAccent,
                  borderRadius: "50% 50% 50% 0 / 60% 60% 40% 40%",
                }}
              />
            </div>
          </div>

          <div>
            <div
              style={{
                ...labelStyle,
                letterSpacing: "2px",
                color: "#6b6258",
              }}
            >
              Camera
            </div>
            <div style={{ ...labelStyle, color: "#2a2620", marginTop: 2 }}>
              Leica M11 · 35mm
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
