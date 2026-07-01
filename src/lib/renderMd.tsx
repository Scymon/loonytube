import React from "react";

/** Escape raw text before it is ever placed into an HTML string. Must run
 *  BEFORE any markdown-style substitution below, or an admin-authored
 *  page body could inject arbitrary HTML/JS (this renders on a public,
 *  unauthenticated route — see src/app/(app)/p/[slug]/page.tsx). */
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Only http(s)/mailto links are rendered as real links; anything else
 *  (javascript:, data:, etc.) is dropped down to plain text. */
const SAFE_LINK_SCHEME = /^(https?:|mailto:)/i;

/** Renders a simple markdown-like string to React nodes.
 *  Supports: h1-h3, hr, bold, italic, inline code, links, paragraphs. */
export function renderMd(text: string): React.ReactNode[] {
  return text.split("\n").map((line, i) => {
    if (line.startsWith("# "))
      return <h1 key={i} className="mt-8 mb-3 text-3xl font-bold text-foam">{line.slice(2)}</h1>;
    if (line.startsWith("## "))
      return <h2 key={i} className="mt-6 mb-2 text-xl font-bold text-foam">{line.slice(3)}</h2>;
    if (line.startsWith("### "))
      return <h3 key={i} className="mt-4 mb-1 text-lg font-semibold text-foam">{line.slice(4)}</h3>;
    if (line.startsWith("---"))
      return <hr key={i} className="my-6 border-edge" />;
    if (line.trim() === "")
      return <div key={i} className="h-3" />;
    const html = escapeHtml(line)
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.+?)\*/g,       "<em>$1</em>")
      .replace(/`(.+?)`/g,          '<code class="rounded bg-panel px-1 py-0.5 text-sm font-mono text-teal">$1</code>')
      .replace(/\[(.+?)\]\((.+?)\)/g, (_m, label: string, url: string) =>
        SAFE_LINK_SCHEME.test(url)
          ? `<a href="${url}" class="text-sky underline hover:brightness-110" rel="noopener noreferrer">${label}</a>`
          : label,
      );
    return (
      <p key={i} className="text-base text-foam/90 leading-7"
        dangerouslySetInnerHTML={{ __html: html }} />
    );
  });
}
