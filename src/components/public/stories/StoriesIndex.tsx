"use client";

import Link from "next/link";
import { useState } from "react";
import { fontRole } from "@/lib/theme/role-style";

export type IndexStory = {
  title: string;
  slug: string;
  dek: string;
  kind: string;
  year: string;
  readTime: string;
  wordCount: number | null;
  frontispiece: string | null;
  isProtected: boolean;
};

export default function StoriesIndex({ stories }: { stories: IndexStory[] }) {
  const [hoverSlug, setHoverSlug] = useState<string | null>(null);
  const hovered = hoverSlug ? stories.find((s) => s.slug === hoverSlug) : null;
  const preview = hovered ?? stories[0] ?? null;

  return (
    <div className="stories-ex">
      <StoryTokens />
      <div
        className="grid"
        style={{
          gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)",
          minHeight: "calc(100dvh - var(--hall-nav-offset, 80px))",
          background: "var(--st-paper)",
          color: "var(--st-ink)",
        }}
      >
        {/* LEFT — contents */}
        <div style={{ padding: "80px 64px 120px", maxWidth: 720, margin: "0 auto", width: "100%" }}>
          <div
            style={{
              ...fontRole("labels"),
              fontSize: 10,
              letterSpacing: 3,
              color: "var(--st-ink-soft)",
            }}
          >
            Vol. I
          </div>
          <div
            style={{
              ...fontRole("headings"),
              fontSize: 84,
              lineHeight: 0.95,
              marginTop: 18,
              letterSpacing: -1.5,
            }}
          >
            Stories
          </div>
          <div
            style={{
              ...fontRole("body"),
              fontSize: 18,
              color: "var(--st-ink-soft)",
              marginTop: 20,
              maxWidth: 480,
              lineHeight: 1.45,
            }}
          >
            Short pieces. Fiction, flash, and essay.
          </div>
          <div style={{ height: 1, width: 56, background: "var(--st-accent)", marginTop: 28 }} />

          <div style={{ marginTop: 60 }}>
            <div
              style={{
                ...fontRole("labels"),
                fontSize: 10,
                letterSpacing: 3,
                color: "var(--st-ink-soft)",
                marginBottom: 20,
              }}
            >
              Contents
            </div>
            {stories.length === 0 ? (
              <p
                style={{
                  ...fontRole("headings"),
                  color: "var(--st-ink-soft)",
                }}
              >
                No stories yet.
              </p>
            ) : (
              stories.map((s, i) => (
                <TOCEntry
                  key={s.slug}
                  story={s}
                  num={i + 1}
                  onHover={() => setHoverSlug(s.slug)}
                  onLeave={() => setHoverSlug(null)}
                  active={hoverSlug === s.slug}
                />
              ))
            )}
          </div>
        </div>

        {/* RIGHT — hovered frontispiece */}
        <div
          style={{
            position: "sticky",
            top: 0,
            height: "calc(100dvh - var(--hall-nav-offset, 80px))",
            overflow: "hidden",
            background: "var(--st-paper-room)",
            borderLeft: "1px solid var(--st-ink-faint)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <IndexPreview story={preview} active={!!hovered} />
        </div>
      </div>
    </div>
  );
}

function TOCEntry({
  story,
  num,
  onHover,
  onLeave,
  active,
}: {
  story: IndexStory;
  num: number;
  onHover: () => void;
  onLeave: () => void;
  active: boolean;
}) {
  return (
    <Link
      href={`/stories/${story.slug}`}
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
      style={{
        display: "grid",
        gridTemplateColumns: "48px 1fr auto",
        gap: 24,
        alignItems: "baseline",
        padding: "22px 0",
        borderBottom: "1px solid var(--st-ink-faint)",
        cursor: "pointer",
        transition: "padding-left 260ms cubic-bezier(.2,.9,.3,1), opacity 200ms",
        paddingLeft: active ? 10 : 0,
        opacity: active ? 1 : 0.88,
        textDecoration: "none",
        color: "inherit",
      }}
    >
      <div
        style={{
          ...fontRole("labels"),
          fontSize: 11,
          letterSpacing: 2,
          color: active ? "var(--st-accent)" : "var(--st-ink-soft)",
          transition: "color 200ms",
        }}
      >
        № {String(num).padStart(2, "0")}
      </div>
      <div>
        <div
          style={{
            ...fontRole("headings"),
            fontSize: 28,
            lineHeight: 1.15,
            color: "var(--st-ink)",
            letterSpacing: -0.2,
          }}
        >
          {story.title}
        </div>
        {story.dek && (
          <div
            style={{
              ...fontRole("body"),
              fontSize: 15,
              color: "var(--st-ink-soft)",
              marginTop: 6,
              lineHeight: 1.45,
              maxWidth: 480,
            }}
          >
            {story.dek}
          </div>
        )}
        <div
          style={{
            marginTop: 10,
            display: "flex",
            gap: 14,
            alignItems: "center",
            ...fontRole("labels"),
            fontSize: 9,
            letterSpacing: 2,
            color: "var(--st-ink-soft)",
            flexWrap: "wrap",
          }}
        >
          <span>{story.kind}</span>
          {story.wordCount && (
            <>
              <Dot />
              <span>{story.wordCount.toLocaleString()} words</span>
            </>
          )}
          {story.readTime && (
            <>
              <Dot />
              <span>{story.readTime}</span>
            </>
          )}
          {story.isProtected && (
            <>
              <Dot />
              <span>Protected</span>
            </>
          )}
        </div>
      </div>
      <div
        style={{
          ...fontRole("headings"),
          fontSize: 14,
          color: active ? "var(--st-accent)" : "transparent",
          transition: "color 200ms, transform 260ms",
          transform: active ? "translateX(0)" : "translateX(-6px)",
          whiteSpace: "nowrap",
        }}
      >
        read →
      </div>
    </Link>
  );
}

function IndexPreview({ story, active }: { story: IndexStory | null; active: boolean }) {
  if (!story) {
    return (
      <div
        style={{
          ...fontRole("headings"),
          color: "var(--st-ink-soft)",
        }}
      >
        Hover a title to preview.
      </div>
    );
  }
  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      {story.frontispiece ? (
        <img
          key={story.slug}
          src={story.frontispiece}
          alt=""
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            filter: "saturate(0.85) brightness(0.92)",
          }}
        />
      ) : (
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "var(--st-paper-room)",
          }}
        />
      )}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "linear-gradient(180deg, rgba(0,0,0,0.05) 0%, rgba(0,0,0,0.45) 100%)",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: 40,
          left: 40,
          right: 40,
          color: story.frontispiece ? "#fff" : "var(--st-ink)",
          opacity: active ? 1 : 0.7,
          transition: "opacity 300ms",
        }}
      >
        <div
          style={{
            ...fontRole("labels"),
            fontSize: 9,
            letterSpacing: 3,
            opacity: 0.8,
          }}
        >
          Frontispiece
        </div>
        <div
          style={{
            ...fontRole("headings"),
            fontSize: 32,
            lineHeight: 1.1,
            marginTop: 10,
            letterSpacing: -0.3,
          }}
        >
          {story.title}
        </div>
      </div>
    </div>
  );
}

function Dot() {
  return (
    <span
      style={{
        width: 3,
        height: 3,
        borderRadius: "50%",
        background: "var(--st-ink-faint)",
      }}
    />
  );
}

function StoryTokens() {
  return (
    <style>{`
      .stories-ex {
        --st-paper: #ffffff;
        --st-paper-room: #fafaf8;
        --st-ink: #2a2620;
        --st-ink-soft: #6b6258;
        --st-ink-faint: #c9c4bb;
        --st-accent: #b8824a;
      }
    `}</style>
  );
}
