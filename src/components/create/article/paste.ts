// Paste conversion: HTML / Markdown clipboard payloads -> article blocks.
import type { Block } from "@/types/article";
import { rid } from "./helpers";

export function htmlToBlocks(html: string): Block[] {
  if (typeof window === "undefined") return [];
  const doc = new DOMParser().parseFromString(html, "text/html");
  const out: Block[] = [];

  function walk(node: Node) {
    if (node.nodeType === Node.TEXT_NODE) {
      const t = node.textContent?.trim();
      if (t) out.push({ id: rid(), type: "text", value: t });
      return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    const el = node as Element;
    const tag = el.tagName.toLowerCase();
    const text = el.textContent?.trim() ?? "";

    const BLOCK_TAGS = ["h1","h2","h3","h4","h5","h6","p","div","blockquote","pre","ul","ol","hr","article","section","figure"];
    const hasBlockChild = Array.from(el.children).some(c => BLOCK_TAGS.includes(c.tagName.toLowerCase()));

    switch (tag) {
      case "h1": case "h2":
        if (text) out.push({ id: rid(), type: "h2", value: text }); break;
      case "h3": case "h4": case "h5": case "h6":
        if (text) out.push({ id: rid(), type: "h3", value: text }); break;
      case "blockquote":
        if (text) out.push({ id: rid(), type: "quote", value: text }); break;
      case "pre":
        if (text) out.push({ id: rid(), type: "code", value: el.textContent ?? "" }); break;
      case "hr":
        out.push({ id: rid(), type: "divider" }); break;
      case "img": {
        const src = el.getAttribute("src");
        if (src && !src.startsWith("data:")) out.push({ id: rid(), type: "image", url: src });
        break;
      }
      case "p": case "li":
        if (!hasBlockChild && text) out.push({ id: rid(), type: "text", value: text });
        else el.childNodes.forEach(walk);
        break;
      default:
        if (hasBlockChild) el.childNodes.forEach(walk);
        else if (text && BLOCK_TAGS.includes(tag)) out.push({ id: rid(), type: "text", value: text });
        else el.childNodes.forEach(walk);
    }
  }

  doc.body.childNodes.forEach(walk);
  return out;
}

export function markdownToBlocks(md: string): Block[] | null {
  const lines = md.split("\n");
  const hasMd = lines.some(l => /^#{1,3}\s/.test(l) || /^>\s/.test(l) || /^```/.test(l) || /^---+$/.test(l));
  if (!hasMd) return null;
  const out: Block[] = [];
  let inCode = false;
  let codeLines: string[] = [];
  for (const line of lines) {
    if (line.startsWith("```")) {
      if (inCode) { out.push({ id: rid(), type: "code", value: codeLines.join("\n") }); codeLines = []; inCode = false; }
      else inCode = true;
      continue;
    }
    if (inCode) { codeLines.push(line); continue; }
    const h2 = line.match(/^#{1,2}\s+(.+)/);
    const h3 = line.match(/^#{3,}\s+(.+)/);
    const q  = line.match(/^>\s*(.*)/);
    if (h3)               out.push({ id: rid(), type: "h3",     value: h3[1] });
    else if (h2)          out.push({ id: rid(), type: "h2",     value: h2[1] });
    else if (q)           out.push({ id: rid(), type: "quote",  value: q[1] });
    else if (/^---+$/.test(line)) out.push({ id: rid(), type: "divider" });
    else if (line.trim()) out.push({ id: rid(), type: "text",   value: line });
  }
  return out.length ? out : null;
}
