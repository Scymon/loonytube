"use client";

import { useEffect } from "react";

// Global keyboard shortcuts for the page builder overlay.
export function useBuilderShortcuts({
  selectedId, setSelectedId, deleteBlock, undo, redo, duplicateBlock,
  togglePreview, setZoom, setShowGrid,
}: {
  selectedId: string | null;
  setSelectedId: (id: string | null) => void;
  deleteBlock: (id: string) => void;
  undo: () => void;
  redo: () => void;
  duplicateBlock: (id: string) => void;
  togglePreview: () => void;
  setZoom: React.Dispatch<React.SetStateAction<number>>;
  setShowGrid: React.Dispatch<React.SetStateAction<boolean>>;
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const tgt = e.target as HTMLElement;
      // Don't intercept when user is typing in an input/textarea
      if (["INPUT", "TEXTAREA", "SELECT"].includes(tgt.tagName) || tgt.isContentEditable) {
        // Allow Escape even inside inputs
        if (e.key === "Escape") { setSelectedId(null); return; }
        return;
      }
      const cmd = e.metaKey || e.ctrlKey;
      switch (true) {
        case e.key === "Escape":
          e.preventDefault();
          setSelectedId(null);
          break;
        case (e.key === "Delete" || e.key === "Backspace") && !!selectedId:
          e.preventDefault();
          deleteBlock(selectedId!);
          break;
        case cmd && !e.shiftKey && e.key === "z":
          e.preventDefault();
          undo();
          break;
        case cmd && e.shiftKey && e.key === "z":
          e.preventDefault();
          redo();
          break;
        case cmd && e.key === "d" && !!selectedId:
          e.preventDefault();
          duplicateBlock(selectedId!);
          break;
        case cmd && e.key === "p":
          e.preventDefault();
          togglePreview();
          break;
        case cmd && (e.key === "=" || e.key === "+"):
          e.preventDefault();
          setZoom(z => Math.max(0.25, Math.min(2, Math.round((z + 0.1) * 20) / 20)));
          break;
        case cmd && e.key === "-":
          e.preventDefault();
          setZoom(z => Math.max(0.25, Math.min(2, Math.round((z - 0.1) * 20) / 20)));
          break;
        case cmd && e.key === "0":
          e.preventDefault();
          setZoom(1);
          break;
        case e.key === "g" && !cmd && !e.shiftKey:
          setShowGrid(g => !g);
          break;
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);
}
