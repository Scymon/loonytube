import React from "react";

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
    const html = line
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.+?)\*/g,       "<em>$1</em>")
      .replace(/`(.+?)`/g,          '<code class="rounded bg-panel px-1 py-0.5 text-sm font-mono text-teal">$1</code>')
      .replace(/\[(.+?)\]\((.+?)\)/g,
               '<a href="$2" class="text-sky underline hover:brightness-110">$1</a>');
    return (
      <p key={i} className="text-base text-foam/90 leading-7"
        dangerouslySetInnerHTML={{ __html: html }} />
    );
  });
}
