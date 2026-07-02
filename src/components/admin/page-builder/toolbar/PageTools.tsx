"use client";

import { useRef, useState } from "react";
import { BLOCK_DEFAULTS, type Block, type BlockType } from "../types";

const VALID_TYPES = new Set(Object.keys(BLOCK_DEFAULTS));

function newId(): string {
  return typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2, 10);
}

// Accepts either a raw block array or our export envelope { version, blocks }.
// Returns fresh-id blocks, or an error string.
export function parseImportedBlocks(text: string): Block[] | string {
  let parsed: unknown;
  try { parsed = JSON.parse(text); } catch { return "Not valid JSON."; }
  const arr = Array.isArray(parsed)
    ? parsed
    : (parsed as { blocks?: unknown })?.blocks;
  if (!Array.isArray(arr)) return "Expected a block array or an export file.";
  const out: Block[] = [];
  for (const item of arr) {
    const b = item as Partial<Block>;
    if (!b || typeof b.type !== "string" || !VALID_TYPES.has(b.type)) {
      return `Unknown block type: ${String((b as { type?: unknown })?.type)}`;
    }
    out.push({
      id: newId(), // always re-id so imports can't collide
      type: b.type as BlockType,
      props: (b.props && typeof b.props === "object" ? b.props : { ...BLOCK_DEFAULTS[b.type as BlockType] }) as Record<string, unknown>,
      ...(typeof b.name === "string" ? { name: b.name } : {}),
      ...(b.hidden === true ? { hidden: true } : {}),
    });
  }
  return out;
}

// "⋯ Tools" menu: page-level power controls. Everything lands in the DRAFT —
// the live page is never touched until Publish.
export default function PageTools({
  slug, blocks, onReplaceDraft,
}: {
  slug: string;
  blocks: Block[];
  onReplaceDraft: (blocks: Block[]) => void;
}) {
  const [open, setOpen]   = useState(false);
  const [note, setNote]   = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function flash(msg: string) {
    setNote(msg);
    setTimeout(() => setNote(null), 2500);
  }

  function exportJson() {
    const payload = JSON.stringify(
      { version: 1, slug, exported_at: new Date().toISOString(), blocks },
      null, 2
    );
    const url = URL.createObjectURL(new Blob([payload], { type: "application/json" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `page-${slug}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setOpen(false);
  }

  async function copyJson() {
    try {
      await navigator.clipboard.writeText(JSON.stringify(blocks, null, 2));
      flash("Copied to clipboard");
    } catch {
      flash("Copy failed");
    }
  }

  function importJson(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = parseImportedBlocks(String(reader.result ?? ""));
      if (typeof result === "string") { flash(result); return; }
      if (!confirm(`Replace the current draft with ${result.length} imported block${result.length === 1 ? "" : "s"}?`)) return;
      onReplaceDraft(result);
      setOpen(false);
    };
    reader.readAsText(file);
    if (fileRef.current) fileRef.current.value = "";
  }

  function clearAll() {
    if (!confirm("Remove every block from the draft? (Undo still works, and nothing publishes until you hit Publish.)")) return;
    onReplaceDraft([]);
    setOpen(false);
  }

  return (
    <div className="relative">
      <input ref={fileRef} type="file" accept="application/json,.json" hidden
        onChange={(e) => importJson(e.target.files)} />
      <button
        onClick={() => setOpen((o) => !o)}
        title="Page tools"
        className={`flex h-7 w-7 items-center justify-center rounded-lg border text-sm transition-colors ${
          open ? "border-teal/50 text-teal bg-teal/10" : "border-edge text-mist/60 hover:text-foam hover:border-foam/30"
        }`}
      >
        ⋯
      </button>
      {open && (
        <div
          className="absolute right-0 top-full z-30 mt-1.5 min-w-[200px] overflow-hidden rounded-xl border border-edge bg-panel py-1 shadow-2xl"
          onMouseLeave={() => setOpen(false)}
        >
          <p className="px-3 pt-1.5 pb-1 text-[9px] font-bold uppercase tracking-[0.12em] text-mist/50">Page tools</p>
          <MenuBtn onClick={exportJson} label="Export as JSON" hint="Download the draft" />
          <MenuBtn onClick={copyJson} label="Copy blocks JSON" hint="To clipboard" />
          <MenuBtn onClick={() => fileRef.current?.click()} label="Import JSON…" hint="Replaces the draft" />
          <div className="my-1 border-t border-edge/50" />
          <MenuBtn onClick={clearAll} label="Clear all blocks" hint="Empty the draft" danger />
          {note && <p className="px-3 py-1.5 text-[10px] text-teal">{note}</p>}
        </div>
      )}
    </div>
  );
}

function MenuBtn({ onClick, label, hint, danger }: {
  onClick: () => void; label: string; hint?: string; danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-baseline justify-between gap-3 px-3 py-1.5 text-left text-xs transition-colors hover:bg-edge/40 ${
        danger ? "text-loonred/80 hover:text-loonred" : "text-foam"
      }`}
    >
      <span>{label}</span>
      {hint && <span className="text-[10px] text-mist/40">{hint}</span>}
    </button>
  );
}
