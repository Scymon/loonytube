"use client";

import { useCallback, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Block, BlockType } from "./types";
import { BLOCK_DEFAULTS } from "./types";

function genId(): string {
  return typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export type SaveStatus = "idle" | "saving" | "saved" | "error";

const MAX_HISTORY = 60;

export function usePageBuilder(pageId: string, initialBlocks: Block[]) {
  const supabase = createClient();
  const [blocks, setBlocks] = useState<Block[]>(initialBlocks);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [preview, setPreview] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  // History refs (not state — avoids stale closures and extra renders)
  const historyRef = useRef<Block[][]>([initialBlocks]);
  const historyIdxRef = useRef(0);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Auto-save ──────────────────────────────────────────────────────────────
  const scheduleSave = useCallback(
    (blocksToSave: Block[]) => {
      setSaveStatus("saving");
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(async () => {
        const { error } = await supabase
          .from("pages")
          .update({ blocks: blocksToSave })
          .eq("id", pageId);
        if (error) {
          setSaveStatus("error");
        } else {
          setSaveStatus("saved");
          setTimeout(() => setSaveStatus((s) => (s === "saved" ? "idle" : s)), 2000);
        }
      }, 1200);
    },
    [pageId, supabase]
  );

  // ── History helpers ────────────────────────────────────────────────────────
  function pushHistory(newBlocks: Block[]) {
    // Trim any forward history
    historyRef.current = historyRef.current
      .slice(0, historyIdxRef.current + 1)
      .slice(-MAX_HISTORY);
    historyRef.current.push(newBlocks);
    historyIdxRef.current = historyRef.current.length - 1;
    setCanUndo(historyIdxRef.current > 0);
    setCanRedo(false);
    setBlocks(newBlocks);
    scheduleSave(newBlocks);
  }

  function undo() {
    if (historyIdxRef.current <= 0) return;
    historyIdxRef.current--;
    const prev = historyRef.current[historyIdxRef.current];
    setBlocks(prev);
    setCanUndo(historyIdxRef.current > 0);
    setCanRedo(true);
    scheduleSave(prev);
  }

  function redo() {
    if (historyIdxRef.current >= historyRef.current.length - 1) return;
    historyIdxRef.current++;
    const next = historyRef.current[historyIdxRef.current];
    setBlocks(next);
    setCanUndo(true);
    setCanRedo(historyIdxRef.current < historyRef.current.length - 1);
    scheduleSave(next);
  }

  // ── Block operations ───────────────────────────────────────────────────────
  function addBlock(type: BlockType, afterId?: string | null): string {
    const block: Block = { id: genId(), type, props: { ...BLOCK_DEFAULTS[type] } };
    const curr = historyRef.current[historyIdxRef.current];
    let next: Block[];
    if (!afterId) {
      next = [...curr, block];
    } else {
      const idx = curr.findIndex((b) => b.id === afterId);
      next = [...curr];
      next.splice(idx + 1, 0, block);
    }
    setSelectedId(block.id);
    pushHistory(next);
    return block.id;
  }

  function addBlockAtIndex(type: BlockType, idx: number): string {
    const block: Block = { id: genId(), type, props: { ...BLOCK_DEFAULTS[type] } };
    const curr = historyRef.current[historyIdxRef.current];
    const next = [...curr];
    next.splice(idx, 0, block);
    setSelectedId(block.id);
    pushHistory(next);
    return block.id;
  }

  function updateBlock(id: string, newProps: Record<string, unknown>) {
    const curr = historyRef.current[historyIdxRef.current];
    const next = curr.map((b) =>
      b.id === id ? { ...b, props: { ...b.props, ...newProps } } : b
    );
    pushHistory(next);
  }

  function duplicateBlock(id: string): string | null {
    const curr = historyRef.current[historyIdxRef.current];
    const idx = curr.findIndex((b) => b.id === id);
    if (idx === -1) return null;
    const copy: Block = {
      id: genId(),
      type: curr[idx].type,
      props: JSON.parse(JSON.stringify(curr[idx].props)),
    };
    const next = [...curr];
    next.splice(idx + 1, 0, copy);
    setSelectedId(copy.id);
    pushHistory(next);
    return copy.id;
  }

  function deleteBlock(id: string) {
    const curr = historyRef.current[historyIdxRef.current];
    const idx = curr.findIndex((b) => b.id === id);
    const next = curr.filter((b) => b.id !== id);
    if (selectedId === id) {
      setSelectedId(next[idx]?.id ?? next[idx - 1]?.id ?? null);
    }
    pushHistory(next);
  }

  function moveBlock(id: string, dir: "up" | "down") {
    const curr = historyRef.current[historyIdxRef.current];
    const idx = curr.findIndex((b) => b.id === id);
    if (idx === -1) return;
    const swap = dir === "up" ? idx - 1 : idx + 1;
    if (swap < 0 || swap >= curr.length) return;
    const next = [...curr];
    [next[idx], next[swap]] = [next[swap], next[idx]];
    pushHistory(next);
  }

  function reorderBlocks(newOrder: Block[]) {
    pushHistory(newOrder);
  }

  function renameBlock(id: string, name: string) {
    const curr = historyRef.current[historyIdxRef.current];
    const next = curr.map((b) => b.id === id ? { ...b, name } : b);
    pushHistory(next);
  }

  function toggleHidden(id: string) {
    const curr = historyRef.current[historyIdxRef.current];
    const next = curr.map((b) => (b.id === id ? { ...b, hidden: !b.hidden } : b));
    pushHistory(next);
  }

  function togglePreview() {
    setPreview((p) => !p);
    if (!preview) setSelectedId(null);
  }

  const selectedBlock = blocks.find((b) => b.id === selectedId) ?? null;

  return {
    blocks, selectedId, selectedBlock, preview, saveStatus,
    canUndo, canRedo,
    setSelectedId, addBlock, addBlockAtIndex, updateBlock,
    duplicateBlock, deleteBlock, moveBlock, reorderBlocks, renameBlock,
    undo, redo, togglePreview, toggleHidden,
  };
}
