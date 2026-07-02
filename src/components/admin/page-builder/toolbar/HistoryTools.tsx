"use client";

import type { SaveStatus } from "../usePageBuilder";

// Undo/redo pair + autosave badge.
export default function HistoryTools({
  undo, redo, canUndo, canRedo, saveStatus,
}: {
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  saveStatus: SaveStatus;
}) {
  const saveLabel =
    saveStatus === "saving" ? "Saving…" :
    saveStatus === "saved"  ? "Saved" :
    saveStatus === "error"  ? "Error" : "";

  return (
    <>
      <div className="flex items-center gap-0.5 rounded-lg bg-panel border border-edge p-0.5">
        <button
          onClick={undo}
          disabled={!canUndo}
          title="Undo (Cmd+Z)"
          className="px-2 py-1 rounded-md text-sm text-mist hover:text-foam disabled:opacity-25 transition-colors"
        >
          ↺
        </button>
        <button
          onClick={redo}
          disabled={!canRedo}
          title="Redo (Cmd+Shift+Z)"
          className="px-2 py-1 rounded-md text-sm text-mist hover:text-foam disabled:opacity-25 transition-colors"
        >
          ↻
        </button>
      </div>
      {saveLabel && (
        <span className={`text-xs font-medium transition-colors ${
          saveStatus === "error" ? "text-loonred" :
          saveStatus === "saved" ? "text-teal" : "text-mist"
        }`}>
          {saveLabel}
        </span>
      )}
    </>
  );
}
