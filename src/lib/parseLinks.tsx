import React from "react";

const EMAIL = /^[^\s@/]+@[^\s@/]+\.[^\s@/]+$/;

/**
 * Parses markdown-style links [text](url) within a string
 * and returns React nodes with anchor tags.
 *
 * A bare email address becomes a mailto: link and a path starting with "/"
 * stays on the site; anything else without a scheme is taken as a web address.
 */
export function parseLinks(text: string): React.ReactNode {
  const parts = text.split(/(\[[^\]]+\]\s*\([^)]+\))/g);
  return parts.map((part, i) => {
    const match = part.match(/^\[([^\]]+)\]\s*\(([^)]+)\)$/);
    if (match) {
      let href = match[2].trim();
      let external = true;
      if (EMAIL.test(href)) {
        href = `mailto:${href}`;
        external = false;
      } else if (href.startsWith("/") || /^(mailto|tel):/i.test(href)) {
        external = false;
      } else if (!/^https?:\/\//i.test(href)) {
        href = `https://${href}`;
      }
      return (
        <a
          key={i}
          href={href}
          className="underline hover:opacity-70"
          {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
        >
          {match[1]}
        </a>
      );
    }
    return part;
  });
}
