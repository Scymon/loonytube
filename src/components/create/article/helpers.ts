// Article composer helpers: constants, pure utilities, and the keyboard/paste
// handler factories (kept out of the hook so every file stays under 300 lines).
import type { Block, BlockType } from "@/types/article";
import { htmlToBlocks, markdownToBlocks } from "./paste";

export const rid = () => Math.random().toString(36).slice(2, 9);
export const DRAFT_KEY = "lt-article-draft-v2";

export function countWords(blocks: Block[]): number {
  return blocks
    .filter((b) => ["text", "h2", "h3", "quote"].includes(b.type))
    .reduce((n, b) => n + (b.value?.trim().split(/\s+/).filter(Boolean).length ?? 0), 0);
}

export function readingTime(words: number): string {
  const m = Math.ceil(words / 200);
  return m <= 1 ? "< 1 min read" : `${m} min read`;
}

// className for each block type's input/display
export function blockClass(type: BlockType): string {
  switch (type) {
    case "h2":    return "w-full bg-transparent text-2xl font-bold text-foam placeholder-mist/30 outline-none border-0 py-0.5 leading-snug";
    case "h3":    return "w-full bg-transparent text-lg font-semibold text-foam placeholder-mist/30 outline-none border-0 py-0.5 leading-snug";
    case "quote": return "w-full bg-transparent text-lg italic text-foam/70 placeholder-mist/30 outline-none border-0 py-0.5 leading-relaxed";
    case "code":  return "w-full bg-black/30 font-mono text-sm text-teal placeholder-mist/30 outline-none border-0 rounded-lg px-4 py-3 leading-relaxed";
    default:      return "w-full bg-transparent text-base text-foam/90 placeholder-mist/30 outline-none border-0 py-0.5 leading-relaxed";
  }
}

// First non-comment line of a dropped uri-list / plain-text payload
export function getDropUrl(e: React.DragEvent): string | null {
  const raw = e.dataTransfer.getData("text/uri-list") || e.dataTransfer.getData("text/plain") || "";
  const first = raw.split("\n").map((l) => l.replace(/\r$/, "")).find((l) => l.trim() && !l.startsWith("#"));
  return first?.trim() ?? null;
}

// ── Editor operations the handler factories need (provided by useArticleEditor) ──
export type EditorOps = {
  blocks: Block[];
  setBlocks: React.Dispatch<React.SetStateAction<Block[]>>;
  setText: (id: string, v: string) => void;
  remove: (id: string) => void;
  focusBlock: (id: string, cursor: "start" | "end") => void;
  blockRefs: React.MutableRefObject<Map<string, HTMLTextAreaElement>>;
  setFocusedId: (id: string | null) => void;
};

export function makeKeyHandler(ops: EditorOps, blockId: string, idx: number) {
  const { blocks, setBlocks, setText, remove, focusBlock, blockRefs, setFocusedId } = ops;
  return (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const el = e.currentTarget;

    // Enter — split block at cursor; code blocks get plain newlines
    if (e.key === "Enter" && !e.shiftKey) {
      const btype = blocks[idx]?.type;
      if (btype === "code") return; // let textarea newline through
      e.preventDefault();
      const cursor = el.selectionStart ?? el.value.length;
      const textBefore = el.value.slice(0, cursor);
      const textAfter  = el.value.slice(el.selectionEnd ?? cursor);
      setText(blockId, textBefore);
      const nb: Block = { id: rid(), type: "text", value: textAfter };
      setBlocks((bs) => {
        const i2 = bs.findIndex((b) => b.id === blockId);
        return i2 === -1 ? [...bs, nb] : [...bs.slice(0, i2 + 1), nb, ...bs.slice(i2 + 1)];
      });
      setTimeout(() => {
        const newEl = blockRefs.current.get(nb.id);
        if (newEl) { newEl.focus(); newEl.setSelectionRange(0, 0); }
        setFocusedId(nb.id);
      }, 30);
      return;
    }

    // Ctrl/Cmd+A — stop propagation so parent modal doesn't intercept;
    // browser's native textarea select-all still fires.
    if ((e.key === "a" || e.key === "A") && (e.ctrlKey || e.metaKey)) {
      e.stopPropagation();
      return;
    }

    if (e.key === "Backspace" && el.selectionStart === 0 && el.selectionEnd === 0) {
      if (el.value === "") {
        // Empty block: delete it and jump to prev
        if (blocks.length <= 1) return;
        e.preventDefault();
        const prev = blocks[idx - 1];
        remove(blockId);
        if (prev && !["image", "divider", "video"].includes(prev.type)) {
          setTimeout(() => focusBlock(prev.id, "end"), 30);
        }
        return;
      }
      // Non-empty block at caret start: merge text onto end of previous block
      const prev = blocks[idx - 1];
      if (!prev || ["image", "divider", "video"].includes(prev.type)) return;
      e.preventDefault();
      const junctionPos = (prev.value ?? "").length;
      setText(prev.id, (prev.value ?? "") + el.value);
      remove(blockId);
      setTimeout(() => {
        const prevEl = blockRefs.current.get(prev.id);
        if (prevEl) { prevEl.focus(); prevEl.setSelectionRange(junctionPos, junctionPos); }
        setFocusedId(prev.id);
      }, 30);
      return;
    }
    // Delete key on empty block only
    if (e.key === "Delete" && el.value === "") {
      if (blocks.length <= 1) return;
      e.preventDefault();
      remove(blockId);
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

export function makePasteHandler(ops: EditorOps, blockId: string, idx: number) {
  const { setBlocks, blockRefs, setFocusedId } = ops;
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
