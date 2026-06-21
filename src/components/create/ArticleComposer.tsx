"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// ─── Types ────────────────────────────────────────────────────────────────────

type BlockType = "text" | "h2" | "h3" | "quote" | "code" | "image" | "divider";

type Block = {
  id: string;
  type: BlockType;
  value?: string;
  url?: string;
  caption?: string;
};

const rid = () => Math.random().toString(36).slice(2, 9);
const DRAFT_KEY = "lt-article-draft-v2";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function countWords(blocks: Block[]): number {
  return blocks
    .filter((b) => ["text", "h2", "h3", "quote"].includes(b.type))
    .reduce((n, b) => n + (b.value?.trim().split(/\s+/).filter(Boolean).length ?? 0), 0);
}
function readingTime(words: number): string {
  const m = Math.ceil(words / 200);
  return m <= 1 ? "< 1 min read" : `${m} min read`;
}

// ─── Block type config ────────────────────────────────────────────────────────

type BlockConfig = { type: BlockType; icon: string; label: string };
const BLOCK_TYPES: BlockConfig[] = [
  { type: "text",    icon: "¶",   label: "Paragraph" },
  { type: "h2",      icon: "H2",  label: "Heading 2" },
  { type: "h3",      icon: "H3",  label: "Heading 3" },
  { type: "quote",   icon: "❝",   label: "Pull quote" },
  { type: "code",    icon: "</>", label: "Code" },
  { type: "divider", icon: "—",   label: "Divider" },
  { type: "image",   icon: "⊞",   label: "Image" },
];

// className for each block type's input/display
function blockClass(type: BlockType): string {
  switch (type) {
    case "h2":    return "w-full bg-transparent text-2xl font-bold text-foam placeholder-mist/30 outline-none border-0 py-0.5 leading-snug";
    case "h3":    return "w-full bg-transparent text-lg font-semibold text-foam placeholder-mist/30 outline-none border-0 py-0.5 leading-snug";
    case "quote": return "w-full bg-transparent text-lg italic text-foam/70 placeholder-mist/30 outline-none border-0 py-0.5 leading-relaxed";
    case "code":  return "w-full bg-black/30 font-mono text-sm text-teal placeholder-mist/30 outline-none border-0 rounded-lg px-4 py-3 leading-relaxed";
    default:      return "w-full bg-transparent text-base text-foam/90 placeholder-mist/30 outline-none border-0 py-0.5 leading-relaxed";
  }
}


// ─── Paste: HTML / Markdown → blocks ─────────────────────────────────────────

function htmlToBlocks(html: string): Block[] {
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

function markdownToBlocks(md: string): Block[] | null {
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

// ─── Auto-growing textarea ────────────────────────────────────────────────────

function AutoText({
  value, onChange, placeholder, className, onEnter, onFocus, onBlur,
  refCallback, onKeyDown, onPaste,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
  onEnter?: () => void;
  onFocus?: () => void;
  onBlur?: () => void;
  refCallback?: (el: HTMLTextAreaElement | null) => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  onPaste?: (e: React.ClipboardEvent<HTMLTextAreaElement>) => void;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = el.scrollHeight + "px";
  }, [value]);
  return (
    <textarea
      ref={(el) => {
        (ref as React.MutableRefObject<HTMLTextAreaElement | null>).current = el;
        refCallback?.(el);
      }}
      value={value}
      rows={1}
      placeholder={placeholder}
      className={className}
      style={{ resize: "none", overflow: "hidden" }}
      onChange={(e) => onChange(e.target.value)}
      onFocus={onFocus}
      onBlur={onBlur}
      onPaste={onPaste}
      onKeyDown={(e) => {
        if (e.key === "Enter" && !e.shiftKey && onEnter) {
          e.preventDefault();
          onEnter();
          return;
        }
        onKeyDown?.(e);
      }}
    />
  );
}

// ─── Floating block toolbar ───────────────────────────────────────────────────

function BlockToolbar({
  canUp, canDown, currentType, onUp, onDown, onChangeType, onDelete, onAddImage,
}: {
  canUp: boolean;
  canDown: boolean;
  currentType: BlockType;
  onUp: () => void;
  onDown: () => void;
  onChangeType: (t: BlockType) => void;
  onDelete: () => void;
  onAddImage: () => void;
}) {
  const [typeOpen, setTypeOpen] = useState(false);
  const cfg = BLOCK_TYPES.find((b) => b.type === currentType);

  return (
    <div className="relative flex items-center gap-0.5 rounded-full border border-edge bg-ink/90 px-1.5 py-1 shadow-lg backdrop-blur-sm"
      onMouseDown={(e) => e.preventDefault()} // don't steal focus
    >
      {/* Move up */}
      <ToolBtn onClick={onUp} disabled={!canUp} title="Move up">
        <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
          <path d="M6 2l4 5H2z"/>
        </svg>
      </ToolBtn>
      {/* Move down */}
      <ToolBtn onClick={onDown} disabled={!canDown} title="Move down">
        <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
          <path d="M6 10L2 5h8z"/>
        </svg>
      </ToolBtn>

      <span className="mx-1 h-3 w-px bg-edge/60" />

      {/* Type switcher */}
      <div className="relative">
        <ToolBtn onClick={() => setTypeOpen((o) => !o)} title="Change block type">
          <span className="text-[10px] font-bold">{cfg?.icon}</span>
          <svg width="8" height="8" viewBox="0 0 8 8" fill="currentColor" className="ml-0.5 opacity-60">
            <path d="M4 6L1 3h6z"/>
          </svg>
        </ToolBtn>
        {typeOpen && (
          <div className="absolute bottom-full left-0 mb-1.5 flex gap-1 rounded-xl border border-edge bg-ink/95 p-1.5 shadow-xl backdrop-blur-sm">
            {BLOCK_TYPES.map((b) => (
              <button
                key={b.type}
                title={b.label}
                onClick={() => {
                  if (b.type === "image") { onAddImage(); }
                  else { onChangeType(b.type); }
                  setTypeOpen(false);
                }}
                className={[
                  "flex h-7 w-7 items-center justify-center rounded-lg text-[11px] font-bold transition",
                  b.type === currentType
                    ? "bg-teal/20 text-teal"
                    : "text-mist hover:bg-edge/40 hover:text-foam",
                ].join(" ")}
              >
                {b.icon}
              </button>
            ))}
          </div>
        )}
      </div>

      <span className="mx-1 h-3 w-px bg-edge/60" />

      {/* Delete */}
      <ToolBtn onClick={onDelete} title="Delete block" danger>
        <svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M2 2l7 7M9 2L2 9"/>
        </svg>
      </ToolBtn>
    </div>
  );
}

function ToolBtn({
  onClick, disabled, title, danger, children,
}: {
  onClick: () => void;
  disabled?: boolean;
  title: string;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={[
        "flex h-6 w-6 items-center justify-center rounded-full transition",
        disabled
          ? "text-mist/30 cursor-not-allowed"
          : danger
          ? "text-mist hover:bg-loonred/20 hover:text-loonred"
          : "text-mist hover:bg-edge/60 hover:text-foam",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

// ─── Add block bar ────────────────────────────────────────────────────────────

function AddBar({ onAdd, uploading }: { onAdd: (t: BlockType) => void; uploading: boolean }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-[10px] font-semibold uppercase tracking-widest text-mist/40">Add</span>
      {BLOCK_TYPES.map(({ type, icon, label }) => (
        <button
          key={type}
          onClick={() => onAdd(type)}
          title={label}
          disabled={uploading}
          className="flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-bold text-mist/50 transition hover:bg-edge/40 hover:text-foam disabled:opacity-30"
        >
          {icon}
        </button>
      ))}
      {uploading && <span className="ml-1 text-xs text-mist">Uploading…</span>}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function ArticleComposer() {
  const supabase = createClient();
  const router   = useRouter();

  const [uid, setUid]             = useState<string | null>(null);
  const [title, setTitle]         = useState("");
  const [cover, setCover]         = useState<string | null>(null);
  const [blocks, setBlocks]       = useState<Block[]>([{ id: rid(), type: "text", value: "" }]);
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const [busy, setBusy]           = useState(false);
  const [uploading, setUploading] = useState(false);
  const [err, setErr]             = useState<string | null>(null);
  const [publishedId, setPublishedId] = useState<string | null>(null);
  const [draftSaved, setDraftSaved]   = useState(false);
  const [hasDraft, setHasDraft]       = useState(false);
  const [dragOver, setDragOver]         = useState<"cover" | "body" | null>(null);
  const [dropIdx, setDropIdx]           = useState<number | null>(null);

  const coverRef       = useRef<HTMLInputElement>(null);
  const imageRef       = useRef<HTMLInputElement>(null);
  const pendingBlockId = useRef<string | null>(null);
  const blockRefs      = useRef<Map<string, HTMLTextAreaElement>>(new Map());

  function focusBlock(id: string, cursor: "start" | "end") {
    const el = blockRefs.current.get(id);
    if (!el) return;
    el.focus();
    const pos = cursor === "end" ? el.value.length : 0;
    el.setSelectionRange(pos, pos);
    setFocusedId(id);
  }

  function makeKeyHandler(blockId: string, idx: number) {
    return (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      const el = e.currentTarget;

      // Ctrl/Cmd+A — stop propagation so parent modal doesn't intercept;
      // browser's native textarea select-all still fires.
      if ((e.key === "a" || e.key === "A") && (e.ctrlKey || e.metaKey)) {
        e.stopPropagation();
        return;
      }

      if ((e.key === "Backspace" || e.key === "Delete") && el.value === "") {
        if (blocks.length <= 1) return;
        e.preventDefault();
        const prev = blocks[idx - 1];
        remove(blockId);
        if (prev && !["image", "divider"].includes(prev.type)) {
          setTimeout(() => focusBlock(prev.id, "end"), 30);
        }
        return;
      }

      if (e.key === "ArrowUp" && el.selectionStart === 0 && el.selectionEnd === 0) {
        const prev = blocks[idx - 1];
        if (prev && !["image", "divider"].includes(prev.type)) {
          e.preventDefault();
          focusBlock(prev.id, "end");
        }
        return;
      }

      if (e.key === "ArrowDown" && el.selectionStart === el.value.length) {
        const next = blocks[idx + 1];
        if (next && !["image", "divider"].includes(next.type)) {
          e.preventDefault();
          focusBlock(next.id, "start");
        }
        return;
      }
    };
  }

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUid(data.user?.id ?? null));
  }, [supabase]);

  useEffect(() => {
    try { if (localStorage.getItem(DRAFT_KEY)) setHasDraft(true); } catch { /**/ }
  }, []);

  const saveDraft = useCallback(() => {
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify({ title, cover, blocks }));
      setDraftSaved(true);
      setTimeout(() => setDraftSaved(false), 2000);
    } catch { /**/ }
  }, [title, cover, blocks]);

  useEffect(() => {
    const t = setInterval(saveDraft, 10_000);
    return () => clearInterval(t);
  }, [saveDraft]);

  function restoreDraft() {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (!raw) return;
      const d = JSON.parse(raw);
      if (d.title)  setTitle(d.title);
      if (d.cover)  setCover(d.cover);
      if (d.blocks) setBlocks(d.blocks);
      setHasDraft(false);
    } catch { /**/ }
  }
  function clearDraft() {
    try { localStorage.removeItem(DRAFT_KEY); } catch { /**/ }
    setHasDraft(false);
  }

  function makePasteHandler(blockId: string, idx: number) {
    return (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
      const html  = e.clipboardData.getData("text/html");
      const plain = e.clipboardData.getData("text/plain");

      let parsed: Block[] | null = null;
      if (html)  parsed = htmlToBlocks(html);
      if ((!parsed || parsed.length <= 1) && plain) {
        const md = markdownToBlocks(plain);
        if (md && md.length > 1) parsed = md;
      }

      // Only intercept if we actually got multiple blocks or a non-text first block
      if (!parsed || parsed.length === 0) return;
      if (parsed.length === 1 && parsed[0].type === "text") return;

      e.preventDefault();
      const last = parsed[parsed.length - 1];

      setBlocks((bs) => {
        const cur = bs[idx];
        const before = bs.slice(0, idx);
        const after  = bs.slice(idx + 1);
        // Replace current block if it's empty, otherwise insert after
        return cur.value?.trim()
          ? [...before, cur, ...parsed!, ...after]
          : [...before, ...parsed!, ...after];
      });

      if (!["image", "divider"].includes(last.type)) {
        setTimeout(() => {
          const el = blockRefs.current.get(last.id);
          if (el) { el.focus(); el.setSelectionRange(el.value.length, el.value.length); }
          setFocusedId(last.id);
        }, 30);
      }
    };
  }

  // ── Drag-and-drop helpers ─────────────────────────────────────────────────
  function getDropUrl(e: React.DragEvent): string | null {
    const raw = e.dataTransfer.getData("text/uri-list") || e.dataTransfer.getData("text/plain") || "";
    const first = raw.split("\n").map((l) => l.replace(/\r$/, "")).find((l) => l.trim() && !l.startsWith("#"));
    return first?.trim() ?? null;
  }

  async function handleCoverDrop(e: React.DragEvent) {
    e.preventDefault(); setDragOver(null);
    const file = e.dataTransfer.files?.[0];
    if (file?.type.startsWith("image/")) { setUploading(true); const u = await upload(file); if (u) setCover(u); setUploading(false); return; }
    const url = getDropUrl(e);
    if (url) setCover(url);
  }

  async function handleBodyDrop(e: React.DragEvent, insertIdx?: number) {
    e.preventDefault(); setDragOver(null);
    const idx = insertIdx ?? blocks.length;
    function splice(bs: Block[], newBlock: Block) {
      return [...bs.slice(0, idx), newBlock, ...bs.slice(idx)];
    }
    const file = e.dataTransfer.files?.[0];
    if (file?.type.startsWith("image/")) {
      setUploading(true); const u = await upload(file);
      if (u) setBlocks((bs) => splice(bs, { id: rid(), type: "image", url: u }));
      setUploading(false); return;
    }
    const url = getDropUrl(e);
    if (url) setBlocks((bs) => splice(bs, { id: rid(), type: "image", url }));
  }

  // ── Upload ─────────────────────────────────────────────────────────────────
  async function upload(file: File): Promise<string | null> {
    if (!uid) return null;
    const ext  = (file.name.split(".").pop() || "jpg").toLowerCase();
    const path = `${uid}/articles/${Date.now()}-${rid()}.${ext}`;
    const { error } = await supabase.storage.from("media").upload(path, file, { upsert: false, contentType: file.type });
    if (error) { setErr(error.message); return null; }
    return supabase.storage.from("media").getPublicUrl(path).data.publicUrl;
  }

  async function pickCover(files: FileList | null) {
    if (!files?.[0]) return;
    setUploading(true); setErr(null);
    const url = await upload(files[0]);
    if (url) setCover(url);
    setUploading(false);
    if (coverRef.current) coverRef.current.value = "";
  }

  async function pickImage(files: FileList | null) {
    if (!files?.[0]) return;
    setUploading(true); setErr(null);
    const url = await upload(files[0]);
    if (url) {
      if (pendingBlockId.current) {
        setBlocks((bs) => bs.map((b) => b.id === pendingBlockId.current ? { ...b, url } : b));
      } else {
        setBlocks((bs) => [...bs, { id: rid(), type: "image", url }]);
      }
    }
    pendingBlockId.current = null;
    setUploading(false);
    if (imageRef.current) imageRef.current.value = "";
  }

  // ── Block ops ──────────────────────────────────────────────────────────────
  const addBlock = (type: BlockType) => {
    if (type === "image") { pendingBlockId.current = null; imageRef.current?.click(); return; }
    const nb = { id: rid(), type, value: "" };
    setBlocks((bs) => [...bs, nb]);
    setTimeout(() => setFocusedId(nb.id), 50);
  };

  function insertAfter(blockId: string) {
    const nb = { id: rid(), type: "text" as BlockType, value: "" };
    setBlocks((bs) => {
      const idx = bs.findIndex((b) => b.id === blockId);
      if (idx === -1) return [...bs, nb];
      return [...bs.slice(0, idx + 1), nb, ...bs.slice(idx + 1)];
    });
    setTimeout(() => {
      const el = blockRefs.current.get(nb.id);
      if (el) { el.focus(); el.setSelectionRange(0, 0); }
      setFocusedId(nb.id);
    }, 30);
  }

  const setText    = (id: string, v: string) => setBlocks((bs) => bs.map((b) => b.id === id ? { ...b, value: v } : b));
  const setCaption = (id: string, v: string) => setBlocks((bs) => bs.map((b) => b.id === id ? { ...b, caption: v } : b));
  const changeType = (id: string, type: BlockType) => setBlocks((bs) => bs.map((b) => b.id === id ? { ...b, type } : b));
  const remove     = (id: string) => setBlocks((bs) => bs.filter((b) => b.id !== id));
  const moveUp     = (i: number) => setBlocks((bs) => { const a = [...bs]; if (i > 0) [a[i-1], a[i]] = [a[i], a[i-1]]; return a; });
  const moveDown   = (i: number) => setBlocks((bs) => { const a = [...bs]; if (i < a.length-1) [a[i], a[i+1]] = [a[i+1], a[i]]; return a; });

  function openImagePicker(blockId: string) {
    pendingBlockId.current = blockId;
    imageRef.current?.click();
  }

  // ── Publish ────────────────────────────────────────────────────────────────
  async function publish() {
    if (!uid) return;
    if (!title.trim()) return setErr("Give your article a title.");
    const clean = blocks
      .map((b) =>
        b.type === "image"   ? { type: "image", url: b.url, caption: b.caption?.trim() || undefined } :
        b.type === "divider" ? { type: "divider" } :
        { type: b.type, value: (b.value || "").trim() }
      )
      .filter((b) =>
        b.type === "image"   ? !!(b as { url?: string }).url :
        b.type === "divider" ? true :
        !!((b as { value?: string }).value)
      );
    if (clean.length === 0) return setErr("Add some content before publishing.");
    setBusy(true); setErr(null);
    const { data, error } = await supabase.from("articles")
      .insert({ owner: uid, title: title.trim(), cover_url: cover, blocks: clean })
      .select("id").single();
    if (error) { setBusy(false); return setErr(error.message); }
    clearDraft();
    setPublishedId((data as { id: string }).id);
    setBusy(false);
  }

  // ── Published ──────────────────────────────────────────────────────────────
  if (publishedId) {
    const url = `${window.location.origin}/article/${publishedId}`;
    return (
      <div className="space-y-4 py-4 text-center">
        <p className="text-lg font-bold text-foam">Article published!</p>
        <p className="text-sm text-mist">Share the link with your audience.</p>
        <div className="flex items-center gap-2 rounded-xl border border-edge bg-surface px-4 py-3">
          <span className="flex-1 truncate text-left text-sm text-foam">{url}</span>
          <button onClick={() => navigator.clipboard.writeText(url)}
            className="shrink-0 rounded-lg bg-teal/20 px-3 py-1.5 text-xs font-semibold text-teal hover:bg-teal/30">
            Copy link
          </button>
        </div>
        <button onClick={() => router.push(`/article/${publishedId}`)} className="text-sm text-sky hover:underline">
          Open article →
        </button>
      </div>
    );
  }

  const words = countWords(blocks);

  // ── Editor ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">

      {/* Draft banner */}
      {hasDraft && (
        <div className="flex items-center justify-between rounded-lg border border-edge bg-surface px-4 py-2.5 text-sm">
          <span className="text-mist">You have an unsaved draft.</span>
          <div className="flex gap-3">
            <button onClick={restoreDraft} className="font-semibold text-teal hover:underline">Restore</button>
            <button onClick={clearDraft}   className="text-mist hover:text-foam">Discard</button>
          </div>
        </div>
      )}

      {/* Title */}
      <AutoText
        value={title}
        onChange={(v) => setTitle(v.slice(0, 200))}
        placeholder="Article title…"
        className="w-full border-0 border-b border-edge bg-transparent pb-4 text-3xl font-bold text-foam placeholder-mist/30 outline-none focus:border-teal"
        onEnter={() => blocks.length > 0 ? focusBlock(blocks[0].id, "start") : insertAfter("")}
      />

      {/* Cover */}
      <input ref={coverRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif" hidden
        onChange={(e) => pickCover(e.target.files)} />
      {cover ? (
        <div className="group relative overflow-hidden rounded-xl"
          onDragOver={(e) => { e.preventDefault(); setDragOver("cover"); }}
          onDragLeave={() => setDragOver(null)}
          onDrop={handleCoverDrop}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={cover} alt="" className="max-h-72 w-full object-cover" />
          <button onClick={() => setCover(null)}
            className="absolute right-3 top-3 rounded-full bg-black/60 px-3 py-1 text-xs font-semibold text-foam opacity-0 backdrop-blur transition group-hover:opacity-100 hover:bg-black">
            Remove cover
          </button>
        </div>
      ) : (
        <button onClick={() => coverRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragOver("cover"); }}
          onDragLeave={() => setDragOver(null)}
          onDrop={handleCoverDrop}
          className={["w-full rounded-xl border border-dashed py-4 text-xs font-semibold transition",
            dragOver === "cover"
              ? "border-teal text-teal bg-teal/5"
              : "border-edge/40 text-mist/40 hover:border-teal/50 hover:text-teal/70",
          ].join(" ")}>
          {dragOver === "cover" ? "Drop to set cover" : "+ Add cover image"}
        </button>
      )}

      {/* Hidden image input */}
      <input ref={imageRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif" hidden
        onChange={(e) => pickImage(e.target.files)} />

      {/* Blocks */}
      <div
        className="space-y-1"
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver("body");
          // Compute which gap the cursor is over
          const children = Array.from(e.currentTarget.children) as HTMLElement[];
          let idx = children.length; // default: after last
          for (let i = 0; i < children.length; i++) {
            const rect = children[i].getBoundingClientRect();
            if (e.clientY < rect.top + rect.height / 2) { idx = i; break; }
          }
          setDropIdx(idx);
        }}
        onDragLeave={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node)) {
            setDragOver(null); setDropIdx(null);
          }
        }}
        onDrop={(e) => { handleBodyDrop(e, dropIdx ?? blocks.length); setDropIdx(null); }}>
        {blocks.map((b, i) => {
          const focused = focusedId === b.id;
          return (
            <div key={b.id}>
              {/* Drop indicator line */}
              {dragOver === "body" && dropIdx === i && (
                <div className="my-1 h-0.5 w-full rounded-full bg-teal/60" />
              )}
            <div className="group relative">
              {/* Floating toolbar — shown when focused */}
              {focused && (
                <div className="absolute -top-8 right-0 z-20">
                  <BlockToolbar
                    canUp={i > 0}
                    canDown={i < blocks.length - 1}
                    currentType={b.type}
                    onUp={() => moveUp(i)}
                    onDown={() => moveDown(i)}
                    onChangeType={(t) => changeType(b.id, t)}
                    onDelete={() => { remove(b.id); setFocusedId(null); }}
                    onAddImage={() => openImagePicker(b.id)}
                  />
                </div>
              )}

              {/* Block content */}
              {b.type === "divider" ? (
                <div className="py-3 cursor-pointer group/div" onClick={() => setFocusedId(b.id === focusedId ? null : b.id)}>
                  <hr className={["border-edge/60 transition", focused ? "border-teal/40" : ""].join(" ")} />
                </div>
              ) : b.type === "image" ? (
                <div className="space-y-1" onClick={() => setFocusedId(b.id)}>
                  <div className={["overflow-hidden rounded-xl transition", focused ? "ring-1 ring-teal/30" : ""].join(" ")}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={b.url} alt={b.caption || ""} className="max-h-[480px] w-full object-cover" />
                  </div>
                  <input
                    value={b.caption ?? ""}
                    onChange={(e) => setCaption(b.id, e.target.value)}
                    onFocus={() => setFocusedId(b.id)}
                    placeholder="Caption…"
                    className="w-full bg-transparent text-center text-xs text-mist/50 placeholder-mist/25 outline-none focus:text-mist" />
                </div>
              ) : b.type === "quote" ? (
                <div className={["border-l-2 pl-4 transition", focused ? "border-teal" : "border-edge/40"].join(" ")}>
                  <AutoText
                    value={b.value ?? ""}
                    onChange={(v) => setText(b.id, v)}
                    placeholder="Pull quote…"
                    className={blockClass(b.type)}
                    onFocus={() => setFocusedId(b.id)}
                    onBlur={() => setTimeout(() => setFocusedId((id) => id === b.id ? null : id), 150)}
                    onEnter={() => insertAfter(b.id)}
                    refCallback={(el) => { if (el) blockRefs.current.set(b.id, el); else blockRefs.current.delete(b.id); }}
                    onKeyDown={makeKeyHandler(b.id, i)}
                    onPaste={makePasteHandler(b.id, i)}
                  />
                </div>
              ) : (
                <AutoText
                  value={b.value ?? ""}
                  onChange={(v) => setText(b.id, v)}
                  placeholder={
                    b.type === "h2"   ? "Heading…" :
                    b.type === "h3"   ? "Subheading…" :
                    b.type === "code" ? "// Code…" :
                    i === 0 ? "Write something…" : ""
                  }
                  className={blockClass(b.type)}
                  onFocus={() => setFocusedId(b.id)}
                  onBlur={() => setTimeout(() => setFocusedId((id) => id === b.id ? null : id), 150)}
                  onEnter={() => insertAfter(b.id)}
                  refCallback={(el) => { if (el) blockRefs.current.set(b.id, el); else blockRefs.current.delete(b.id); }}
                  onKeyDown={makeKeyHandler(b.id, i)}
                  onPaste={makePasteHandler(b.id, i)}
                />
              )}
            </div>
            </div>
          );
        })}
        {/* Drop indicator after last block */}
        {dragOver === "body" && dropIdx === blocks.length && (
          <div className="my-1 h-0.5 w-full rounded-full bg-teal/60" />
        )}
      </div>

      {/* Add block bar */}
      <div className="border-t border-edge/30 pt-3">
        <AddBar onAdd={addBlock} uploading={uploading} />
      </div>

      {err && <p className="text-sm text-loonred">{err}</p>}

      {/* Footer */}
      <div className="flex items-center justify-between border-t border-edge/30 pt-4">
        <div className="flex items-center gap-4 text-xs text-mist/50">
          <span>{words.toLocaleString()} words · {readingTime(words)}</span>
          {draftSaved
            ? <span className="text-teal">Saved</span>
            : <button onClick={saveDraft} className="hover:text-foam transition">Save draft</button>
          }
        </div>
        <button onClick={publish} disabled={busy || uploading}
          className="rounded-[10px] px-6 py-3 text-sm font-bold text-ink disabled:opacity-50"
          style={{ backgroundImage: "linear-gradient(180deg,#3ad6bd,#3e9fe6)" }}>
          {busy ? "Publishing…" : "Publish"}
        </button>
      </div>
    </div>
  );
}
