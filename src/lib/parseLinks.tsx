import React from "react";

/**
 * Parses markdown-style links [text](url) within a string
 * and returns React nodes with anchor tags.
 */
export function parseLinks(text: string): React.ReactNode {
  const parts = text.split(/(\[[^\]]+\]\s*\([^)]+\))/g);
  return parts.map((part, i) => {
    const match = part.match(/^\[([^\]]+)\]\s*\(([^)]+)\)$/);
    if (match) {
      let href = match[2].trim();
      if (!/^https?:\/\//i.test(href)) href = `https://${href}`;
      return (
        <a key={i} href={href} className="underline hover:opacity-70" target="_blank" rel="noopener noreferrer">
          {match[1]}
        </a>
      );
    }
    return part;
  });
}
