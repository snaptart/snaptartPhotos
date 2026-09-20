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

export const STORIES_INDEX_DEFAULTS = {
  volumeLabel: "Vol. I",
  title: "Stories",
  dek: "Short pieces. Fiction, flash, and essay.",
} as const;

type StoriesIndexProps = {
  stories: IndexStory[];
  volumeLabel?: string;
  title?: string;
  dek?: string;
};

export default function StoriesIndex({
  stories,
  volumeLabel = STORIES_INDEX_DEFAULTS.volumeLabel,
  title = STORIES_INDEX_DEFAULTS.title,
  dek = STORIES_INDEX_DEFAULTS.dek,
}: StoriesIndexProps) {
  return (
    <div className="stories-ex">
      <StoryTokens />
      <StoriesIndexInner
        stories={stories}
        volumeLabel={volumeLabel}
        title={title}
        dek={dek}
      />
    </div>
  );
}

function StoriesIndexInner({
  stories,
  volumeLabel,
  title,
  dek,
}: {
  stories: IndexStory[];
  volumeLabel: string;
  title: string;
  dek: string;
}) {
  const [hoverSlug, setHoverSlug] = useState<string | null>(null);
  const hovered = hoverSlug ? stories.find((s) => s.slug === hoverSlug) : null;
  const preview = hovered ?? stories[0] ?? null;

  return (
    <div
      className="stories-ex__index"
      style={{
        background: "var(--st-paper)",
        color: "var(--st-ink)",
      }}
    >
      {/* LEFT — contents */}
      <div className="stories-ex__index-main">
        <div
          style={{
            ...fontRole("labels"),
            fontSize: 10,
            letterSpacing: 3,
            color: "var(--st-ink-soft)",
          }}
        >
          {volumeLabel}
        </div>
        <div
          className="stories-ex__index-headline"
          style={{
            ...fontRole("headings"),
            lineHeight: 0.95,
            marginTop: 18,
            letterSpacing: -1.5,
          }}
        >
          {title}
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
          {dek}
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

      {/* RIGHT — hovered frontispiece (desktop only) */}
      <div className="stories-ex__index-aside">
        <IndexPreview story={preview} active={!!hovered} />
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
  const numPad = String(num).padStart(2, "0");
  return (
    <Link
      href={`/stories/${story.slug}`}
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
      className="stories-ex__entry"
      style={{
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
        className={`stories-ex__entry-thumb${story.frontispiece ? " has-image" : ""}`}
        style={story.frontispiece ? { backgroundImage: `url(${story.frontispiece})` } : undefined}
      >
        <span className="stories-ex__thumb-num" style={fontRole("labels")}>
          № {numPad}
        </span>
      </div>
      <div
        className="stories-ex__entry-num"
        style={{
          ...fontRole("labels"),
          fontSize: 11,
          letterSpacing: 2,
          color: active ? "var(--st-accent)" : "var(--st-ink-soft)",
          transition: "color 200ms",
        }}
      >
        № {numPad}
      </div>
      <div className="stories-ex__entry-content">
        <div
          className="stories-ex__entry-title"
          style={{
            ...fontRole("headings"),
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
        className="stories-ex__entry-arrow"
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

export function StoryTokens() {
  return (
    <style>{`
      .stories-ex {
        --st-paper: #ffffff;
        --st-paper-room: #fafaf8;
        --st-ink: #2a2620;
        --st-ink-faint: #c9c4bb;
        --st-ink-soft: #6b6258;
        --st-accent: #b8824a;
      }

      /* index layout */
      .stories-ex__index {
        display: grid;
        grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
        min-height: calc(100dvh - var(--hall-nav-offset, 80px));
      }
      .stories-ex__index-main {
        padding: 80px 64px 120px;
        max-width: 720px;
        margin: 0 auto;
        width: 100%;
      }
      .stories-ex__index-headline { font-size: 84px; }
      .stories-ex__index-aside {
        position: sticky;
        top: 0;
        height: calc(100dvh - var(--hall-nav-offset, 80px));
        overflow: hidden;
        background: var(--st-paper-room);
        border-left: 1px solid var(--st-ink-faint);
        display: flex;
        align-items: center;
        justify-content: center;
      }

      /* TOC entry — desktop */
      .stories-ex__entry {
        display: grid;
        grid-template-columns: 48px 1fr auto;
        grid-template-areas: "num content arrow";
        gap: 24px;
        align-items: baseline;
        padding: 22px 0;
      }
      .stories-ex__entry-num { grid-area: num; }
      .stories-ex__entry-content { grid-area: content; }
      .stories-ex__entry-arrow { grid-area: arrow; }
      .stories-ex__entry-title { font-size: 28px; }
      .stories-ex__entry-thumb { display: none; }

      /* mobile */
      @media (max-width: 768px) {
        .stories-ex__index {
          grid-template-columns: 1fr;
        }
        .stories-ex__index-main {
          padding: 48px 24px 80px;
          max-width: none;
        }
        .stories-ex__index-headline {
          font-size: clamp(48px, 12vw, 72px);
          letter-spacing: -1px;
        }
        .stories-ex__index-aside { display: none; }

        .stories-ex__entry {
          grid-template-columns: 96px minmax(0, 1fr);
          grid-template-rows: auto 1fr;
          grid-template-areas:
            "thumb content"
            "thumb content";
          column-gap: 16px;
          row-gap: 0;
          align-items: start;
          padding: 18px 0;
        }
        .stories-ex__entry-thumb {
          display: flex;
          grid-area: thumb;
          width: 96px;
          height: 124px;
          background-color: var(--st-paper-room);
          background-size: cover;
          background-position: center;
          border: 1px solid var(--st-ink-faint);
          align-items: flex-end;
          justify-content: flex-start;
          padding: 8px;
          position: relative;
          overflow: hidden;
        }
        .stories-ex__entry-thumb.has-image::after {
          content: "";
          position: absolute;
          inset: 0;
          background: linear-gradient(transparent 55%, rgba(0,0,0,0.5));
          pointer-events: none;
        }
        .stories-ex__thumb-num {
          position: relative;
          z-index: 1;
          font-size: 9px;
          letter-spacing: 2px;
          color: var(--st-ink-soft);
        }
        .stories-ex__entry-thumb.has-image .stories-ex__thumb-num {
          color: #fff;
        }
        .stories-ex__entry-thumb:not(.has-image) .stories-ex__thumb-num {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 14px;
          letter-spacing: 3px;
          color: var(--st-ink-soft);
        }
        .stories-ex__entry-num { display: none; }
        .stories-ex__entry-arrow { display: none; }
        .stories-ex__entry-title {
          font-size: clamp(20px, 5.5vw, 24px);
          letter-spacing: -0.1px;
        }
      }
    `}</style>
  );
}
