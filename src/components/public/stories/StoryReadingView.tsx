"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { fontRole } from "@/lib/theme/role-style";

export default function StoryReadingView({
  number,
  title,
  dek,
  kind,
  year,
  wordCount,
  readTime,
  frontispiece,
  nextStory,
  children,
}: {
  number: number;
  title: string;
  dek: string;
  kind: string;
  year: string;
  wordCount: number | null;
  readTime: string;
  frontispiece: string | null;
  nextStory: { title: string; slug: string; dek: string } | null;
  children: React.ReactNode;
}) {
  const [progress, setProgress] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => {
      const doc = document.documentElement;
      const total = doc.scrollHeight - doc.clientHeight;
      const p = total > 0 ? doc.scrollTop / total : 0;
      setProgress(Math.max(0, Math.min(1, p)));
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div ref={rootRef} className="stories-ex">
      <StoryTokens />

      {/* progress bar */}
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          height: 2,
          zIndex: 30,
          pointerEvents: "none",
        }}
      >
        <div
          style={{
            width: `${progress * 100}%`,
            height: "100%",
            background: "var(--st-accent)",
            transition: "width 80ms linear",
          }}
        />
      </div>

      {/* title page */}
      <div
        style={{
          padding: "120px 32px 80px",
          maxWidth: 760,
          margin: "0 auto",
          textAlign: "center",
        }}
      >
        <div
          style={{
            ...fontRole("labels"),
            fontSize: 10,
            letterSpacing: 3,
            color: "var(--st-ink-soft)",
          }}
        >
          № {String(number).padStart(2, "0")} · {kind} · {year}
        </div>
        <h1
          style={{
            ...fontRole("headings"),
            fontSize: 72,
            lineHeight: 1.03,
            marginTop: 28,
            letterSpacing: -1.2,
            textWrap: "balance",
          }}
        >
          {title}
        </h1>
        {dek && (
          <p
            style={{
              ...fontRole("body"),
              fontSize: 20,
              color: "var(--st-ink-soft)",
              marginTop: 24,
              lineHeight: 1.45,
              maxWidth: 560,
              marginLeft: "auto",
              marginRight: "auto",
              textWrap: "pretty",
            }}
          >
            {dek}
          </p>
        )}
        <div
          style={{
            width: 40,
            height: 1,
            background: "var(--st-accent)",
            margin: "44px auto 0",
          }}
        />
        {(wordCount || readTime) && (
          <div
            style={{
              marginTop: 24,
              ...fontRole("labels"),
              fontSize: 9,
              letterSpacing: 2.5,
              color: "var(--st-ink-soft)",
              display: "inline-flex",
              gap: 16,
              alignItems: "center",
            }}
          >
            {wordCount && <span>{wordCount.toLocaleString()} words</span>}
            {wordCount && readTime && <Dot />}
            {readTime && <span>{readTime}</span>}
          </div>
        )}
      </div>

      {/* frontispiece */}
      {frontispiece && (
        <div style={{ maxWidth: 1000, margin: "0 auto 80px", padding: "0 32px" }}>
          <div
            style={{
              padding: 14,
              background: "#fff",
              boxShadow:
                "0 30px 80px rgba(0,0,0,0.12), 0 6px 16px rgba(0,0,0,0.08)",
            }}
          >
            <img
              src={frontispiece}
              alt=""
              style={{
                display: "block",
                width: "100%",
                height: "auto",
                aspectRatio: "16 / 9",
                objectFit: "cover",
              }}
            />
          </div>
          <div
            style={{
              marginTop: 12,
              textAlign: "center",
              ...fontRole("labels"),
              fontSize: 9,
              letterSpacing: 2.5,
              color: "var(--st-ink-soft)",
            }}
          >
            Frontispiece
          </div>
        </div>
      )}

      {/* body */}
      <article
        className="story-body"
        style={{
          maxWidth: 680,
          margin: "0 auto",
          padding: "40px 32px 80px",
          ...fontRole("body"),
          fontSize: 20,
          lineHeight: 1.7,
          color: "var(--st-ink)",
        }}
      >
        {children}
      </article>

      {/* end mark */}
      <div
        style={{
          textAlign: "center",
          padding: "20px 0 80px",
          ...fontRole("headings"),
          fontSize: 22,
          color: "var(--st-ink-soft)",
        }}
      >
        ❦
      </div>

      {/* colophon / next */}
      <div
        style={{
          borderTop: "1px solid var(--st-ink-faint)",
          padding: "60px 32px 100px",
          maxWidth: 1000,
          margin: "0 auto",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: nextStory ? "1fr 1fr" : "1fr",
            gap: 40,
            alignItems: "start",
          }}
        >
          <div>
            <div
              style={{
                ...fontRole("labels"),
                fontSize: 9,
                letterSpacing: 2.5,
                color: "var(--st-ink-soft)",
              }}
            >
              End of № {String(number).padStart(2, "0")}
            </div>
            <div
              style={{
                ...fontRole("headings"),
                fontSize: 24,
                marginTop: 10,
                lineHeight: 1.2,
              }}
            >
              {title}
            </div>
            <div style={{ display: "flex", gap: 12, marginTop: 24, flexWrap: "wrap" }}>
              <Link href="/stories" style={btnStyle("primary")}>
                ← Contents
              </Link>
            </div>
          </div>
          {nextStory && (
            <Link
              href={`/stories/${nextStory.slug}`}
              style={{ textDecoration: "none", color: "inherit", cursor: "pointer" }}
            >
              <div
                style={{
                  ...fontRole("labels"),
                  fontSize: 9,
                  letterSpacing: 2.5,
                  color: "var(--st-ink-soft)",
                }}
              >
                Next
              </div>
              <div
                style={{
                  ...fontRole("headings"),
                  fontSize: 30,
                  marginTop: 10,
                  lineHeight: 1.1,
                  color: "var(--st-ink)",
                  letterSpacing: -0.3,
                }}
              >
                {nextStory.title}
              </div>
              {nextStory.dek && (
                <div
                  style={{
                    ...fontRole("body"),
                    fontSize: 15,
                    color: "var(--st-ink-soft)",
                    marginTop: 8,
                    lineHeight: 1.45,
                  }}
                >
                  {nextStory.dek}
                </div>
              )}
              <div
                style={{
                  marginTop: 24,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 10,
                  ...fontRole("headings"),
                  fontSize: 16,
                  color: "var(--st-accent)",
                }}
              >
                Continue reading →
              </div>
            </Link>
          )}
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
        display: "inline-block",
      }}
    />
  );
}

function btnStyle(kind: "primary" | "ghost"): React.CSSProperties {
  const base: React.CSSProperties = {
    padding: "12px 20px",
    ...fontRole("labels"),
    fontSize: 10,
    letterSpacing: 2,
    border: "1px solid var(--st-ink)",
    textDecoration: "none",
    display: "inline-block",
  };
  if (kind === "primary") {
    return { ...base, background: "var(--st-ink)", color: "var(--st-paper)" };
  }
  return { ...base, background: "transparent", color: "var(--st-ink)" };
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
      .story-body > *:first-child::first-letter,
      .story-body > p:first-of-type::first-letter {
        float: left;
        font-family: var(--theme-font-headings-family);
        font-weight: var(--theme-font-headings-weight);
        font-style: var(--theme-font-headings-style);
        text-transform: var(--theme-font-headings-transform);
        font-size: 86px;
        line-height: 0.8;
        padding: 8px 10px 0 0;
        color: var(--st-accent);
      }
      .story-body p { margin: 0 0 1.1em; text-wrap: pretty; }
      .story-body blockquote {
        margin: 1.8em -28px;
        padding: 28px 0;
        border-top: 1px solid var(--st-ink-faint);
        border-bottom: 1px solid var(--st-ink-faint);
        font-family: var(--theme-font-headings-family);
        font-weight: var(--theme-font-headings-weight);
        font-style: var(--theme-font-headings-style);
        text-transform: var(--theme-font-headings-transform);
        font-size: 28px;
        line-height: 1.3;
        text-align: center;
        color: var(--st-ink);
        letter-spacing: -0.2px;
        text-wrap: balance;
      }
      .story-body hr {
        border: none;
        text-align: center;
        margin: 2.2em 0;
        color: var(--st-ink-soft);
        letter-spacing: 0.8em;
      }
      .story-body hr::before {
        content: "· · ·";
        font-family: var(--theme-font-headings-family);
        font-size: 22px;
      }
      .story-body h2 {
        text-align: center;
        margin: 2.6em 0 1.4em;
        font-family: var(--theme-font-headings-family);
        font-weight: var(--theme-font-headings-weight);
        font-style: var(--theme-font-headings-style);
        text-transform: var(--theme-font-headings-transform);
        font-size: 40px;
        color: var(--st-accent);
        letter-spacing: -0.2px;
      }
    `}</style>
  );
}
